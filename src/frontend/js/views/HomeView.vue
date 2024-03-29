<template>
    <div id="home">
        <HomeHero />

        <section>
            <div class="container">
                <h2>How To Play</h2>
                <ul>
                    <li>
                        Get together with your friends on Skype, Google Hangouts, Zoom, or another video
                        chat service.
                    </li>
                    <li>Your quiz master / host will start a room and give you a link to join.</li>
                    <li>Your hosts reads questions aloud and sends the question to your device.</li>
                    <li>
                        Answer by pressing:
                        <ul>
                            <li>The first answer for, for normal questions.</li>
                            <li>The letter corresponding to the answer, for multiple choice questions.</li>
                            <li>Or by typing in your answer for number questions.</li>
                        </ul>
                    </li>
                    <li>There are bonus points for being the first person to get the answer correct!</li>
                </ul>
            </div>
        </section>

        <section>
            <div class="container">
                <div id="features">
                    <div>
                        <i class="fas fa-text fa-4x"></i>
                        <h3>Letter Questions</h3>
                        <p>Players answer with the first letter of the answer for 1 point.</p>
                    </div>

                    <div>
                        <i class="fas fa-calculator fa-4x"></i>
                        <h3>Number Questions</h3>
                        <p>Players enter the answer on a number pad for 2 points.</p>
                    </div>

                    <div>
                        <i class="fas fa-check-square fa-4x"></i>
                        <h3>Multiple Choice</h3>
                        <p>Answer from A, B, C, or D for 1 point.</p>
                    </div>

                    <div>
                        <i class="fas fa-tachometer-alt-fastest fa-4x"></i>
                        <h3>Fastest Answer Bonus</h3>
                        <p>The first player to get the correct answer gets 1 bonus point.</p>
                    </div>

                    <div>
                        <i class="fas fa-people-arrows fa-4x"></i>
                        <h3>Closest Answer</h3>
                        <p>
                            If nobody correctly answers a number question the players that guessed closest get 1
                            point.
                        </p>
                    </div>

                    <div>
                        <i class="fas fa-user-cowboy fa-4x"></i>
                        <h3>Unlimited Players</h3>
                        <p>There's no limit to how many players can be in a game.</p>
                    </div>
                </div>
            </div>
        </section>

        <section>
            <div class="container">
                <h2>How To Host</h2>

                <div class="row">
                    <div class="col-md-12">
                        <div class="text-center"
                             style="margin: 30px">
                            <a class="btn btn-warning btn-lg"
                               href="#"
                               @click.prevent="hostGame">
                                Host A Game
                            </a>
                        </div>

                        <ul>
                            <li>Start a game with the <strong>Host A Game</strong> button above.</li>
                            <li>As quizmaster you are in control.</li>
                            <li>You can see the current scores on the first page.</li>
                            <li>Start a new question by selecting letters, numbers, or multiple choice.</li>
                            <li>Enter the correct answer so users can earn points if they get it right.</li>
                            <li>
                                When you're ready for players to stat answering press <strong>Start Answering</strong>.
                            </li>
                            <li>
                                When time is up press <strong>Stop Answering</strong>. You'll see who answered and who
                                was correct. Bonus points are awarded for the fastest player, and for the closest answer
                                in a numbers question.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
        <PageFooter />
    </div>
</template>


<script>
import HomeHero from '@frontend/components/HomeHero';
import axios from 'axios';
import PageFooter from '@frontend/components/PageFooter';

export default {
    components: {
        HomeHero,
        PageFooter
    },

    methods: {
        hostGame() {
            axios.post('/api/rooms')
                .then((response) => {
                    this.$router.push(`/${response.data.room.code}/host/${response.data.password}`);
                });
        }
    }
};
</script>

<style lang="less">
@import (less, reference) "../../less/app.less";

#home {
    background: #fff;
    min-height: 100vh;

    section {
        p,
        li {
            line-height: 1.5;
        }

        ul {
            margin-top: 20px;
        }

        li {
            margin: 5px 0;
        }
    }

    section {
        .container {
            padding: 30px 15px;
        }
    }

    section:nth-child(odd) {
        background: #f6f7eb;
    }

    #features {
        text-align: center;

        div:not(:last-child) {
            margin-bottom: 30px;
        }
    }
}

@media (max-width: @screen-sm-max) {
    h2 {
        text-align: center;
    }
}

@media (min-width: @screen-md) {
    #home {
        section {
            .container {
                padding: 50px 15px;
            }
        }

        #features {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            grid-gap: 30px;

            div {
                margin: 0;
            }
        }
    }
}
</style>
