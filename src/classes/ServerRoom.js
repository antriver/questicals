const Answer = require('./Answer');
const Player = require('./Player');
const Question = require('./Question');
const { hydrate } = require('../functions/utils');
const { calculateOnQuestionAnswered, calculateOnQuestionEnded } = require('../functions/answers');
const { sanitizeRoom } = require('../functions/rooms');

class ServerRoom {
    /**
     * @param {Room} room
     * @param io
     */
    constructor(room, io) {
        /**
         * @type {Room}
         */
        this.room = room;

        /**
         * @type {string}
         */
        this.hostPassword = '';

        this.stopQuestionTimeout = null;
        this.questionTimerInterval = null;

        this.nsp = io.of('/' + room.code);

        this.nsp.on('connection', (socket) => {
            console.log(this.room.code, socket.id, 'Connected', socket.request.connection.remoteAddress);

            const registerPlayer = (data) => {
                if (!room.players[data.id]) {
                    room.players[data.id] = new Player({
                        id: data.id,
                        name: data.name
                    });
                }

                room.players[data.id].joinedAt = new Date();
                room.players[data.id].name = data.name;
                room.players[data.id].active = true;
                room.players[data.id].websocketId = socket.id;
            };

            // When a new user joins.
            // Add them to the room and broadcast to everyone.
            socket.on('registerPlayer', (data, callback) => {
                // console.log(socket.id, 'Register Player', data);
                if (data) {
                    registerPlayer(data);

                    this.broadcast();
                    if (typeof callback === 'function') {
                        callback();
                    }
                }
            });

            // When a user is confirming they're still here.
            // Add them to the room but don't broadcast.
            socket.on('reRegisterPlayer', (data, callback) => {
                // console.log(socket.id, 'Re-Register Player', data);
                if (data) {
                    registerPlayer(data);

                    if (typeof callback === 'function') {
                        callback();
                    }
                }
            });

            socket.on('disconnect', () => {
                const player = room.getPlayerByWebsocketId(socket.id);

                console.log(socket.id, 'Disconnect', player ? player.name : null);

                const index = room.hostWebsocketIds.indexOf(socket.id);
                if (index !== -1) {
                    room.hostWebsocketIds.splice(index, 1);
                }

                if (player) {
                    player.active = false;
                    this.broadcast();
                }
            });

            /**
             * Player functions...
             */
            socket.on('questionAnswered', (data) => {
                console.log(socket.id, 'Question Answered', data.answer);

                const player = room.getPlayerByWebsocketId(socket.id);
                if (!player) {
                    console.error(socket.id, 'Unknown player.');
                    return;
                }

                if (!room.currentQuestion) {
                    console.error(socket.id, 'No current question.');
                    return;
                }

                if (data.questionId !== room.currentQuestion.id) {
                    console.error(socket.id, 'Not the current question ID.', data.questionId);
                    return;
                }

                if (!room.currentQuestion.started) {
                    console.error(socket.id, 'Too early.');
                    return;
                }

                if (room.currentQuestion.ended) {
                    console.error(socket.id, 'Too late.');
                    return;
                }

                // Check if player already answered.
                if (room.currentQuestion.answers.hasOwnProperty(player.id)) {
                    console.error(socket.id, 'Already answered.');
                    return;
                }

                const answer = new Answer({
                    player,
                    answer: data.answer,
                    answeredAt: new Date()
                });

                calculateOnQuestionAnswered(room.currentQuestion, answer);

                this.broadcast();
            });

            /**
             * Host functions...
             */

            const isHost = () => room.hostWebsocketIds.indexOf(socket.id) !== -1;

            socket.on('becomeHost', (data, callback) => {
                console.log(socket.id, 'Become Host');

                if (data.password !== this.hostPassword) {
                    callback(false);
                    return;
                }

                if (!isHost()) {
                    room.hostWebsocketIds.push(socket.id);
                }

                this.broadcast();
                if (typeof callback === 'function') {
                    callback(true);
                }
            });

            socket.on('newQuestion', (data) => {
                if (!isHost()) {
                    return;
                }

                room.currentQuestion = new Question(data);
                console.log(socket.id, 'New Question', JSON.stringify(room.currentQuestion));
                this.broadcast();
            });

            socket.on('updateQuestion', (data) => {
                if (!isHost()) {
                    return;
                }

                hydrate(room.currentQuestion, data);

                console.log(socket.id, 'Updated Question', JSON.stringify(room.currentQuestion));
                this.broadcast();
            });

            socket.on('clearQuestion', () => {
                if (!isHost()) {
                    return;
                }

                console.log(socket.id, 'Clear Question');
                room.currentQuestion = null;
                this.broadcast();
            });

            socket.on('removePlayer', (playerId) => {
                if (!isHost()) {
                    return;
                }

                console.log(socket.id, 'Remove Player', playerId);
                delete room.players[playerId];
                this.broadcast();
            });

            socket.on('adjustScore', ({ playerId, adjustBy }) => {
                if (!isHost()) {
                    return;
                }

                if (!room.players[playerId]) {
                    return;
                }

                console.log(socket.id, 'Adjust Score', playerId, adjustBy);
                room.players[playerId].score += adjustBy;
                room.players[playerId].manualScoreAdjustment += adjustBy;

                this.broadcast();
            });

            socket.on('resetScores', () => {
                if (!isHost()) {
                    return;
                }

                console.log(socket.id, 'Reset Scores');
                Object.values(room.players)
                    .forEach((player) => {
                        player.score = 0;
                        player.manualScoreAdjustment = 0;
                    });
                this.broadcast();
            });

            socket.on('resetUsers', () => {
                if (!isHost()) {
                    return;
                }

                console.log(socket.id, 'Reset Scores');
                room.players = {};
                this.broadcast();
            });

            socket.on('startQuestion', (questionId) => {
                if (!isHost()) {
                    return;
                }

                console.log(socket.id, 'Start Question', questionId);
                if (room.currentQuestion && questionId === room.currentQuestion.id) {
                    room.currentQuestion.started = true;
                    room.currentQuestion.startedAt = new Date();

                    if (room.currentQuestion.timeLimit) {
                        // We need to deal with the time limit.
                        // End the question when it is up, and frequently send the remaining time in ms to clients.
                        this.startQuestionTimer(room.currentQuestion.timeLimit);
                    }
                } else {
                    console.log(socket.id, 'Invalid question ID.');
                }
                this.broadcast();
            });

            socket.on('endQuestion', (questionId) => {
                if (!isHost()) {
                    return;
                }

                console.log(socket.id, 'End Question', questionId);
                if (room.currentQuestion && questionId === room.currentQuestion.id) {
                    this.endQuestion();
                } else {
                    console.log('Invalid question ID.');
                }
            });
        });
    }

    startQuestionTimer(ms) {
        const endsAtMs = (new Date()).getTime() + ms;

        this.questionTimerInterval = setInterval(
            () => {
                if (this.room.currentQuestion) {
                    this.room.currentQuestion.timeRemaining = endsAtMs - (new Date()).getTime();
                    this.broadcast();
                }
            },
            200
        );

        this.stopQuestionTimeout = setTimeout(
            () => {
                if (this.room.currentQuestion) {
                    this.endQuestion();
                }
            },
            ms
        );
    }

    endQuestion() {
        clearInterval(this.questionTimerInterval);
        clearInterval(this.stopQuestionTimeout);

        this.room.currentQuestion.ended = true;
        calculateOnQuestionEnded(this.room.currentQuestion);
        this.broadcast();
    }

    broadcast() {
        // Instead of just emitting the room to all sockets we are going to iterate over the connected sockets,
        // because some users (the hosts) should receive the full data.
        Object.values(this.nsp.clients().connected)
            .forEach((socket) => {
                if (this.room.hostWebsocketIds.indexOf(socket.id) !== -1) {
                    socket.emit('roomUpdated', this.room);
                } else {
                    socket.emit('roomUpdated', sanitizeRoom(this.room, socket.id));
                }
            });
    }
}

module.exports = ServerRoom;
