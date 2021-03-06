'use strict';

//Word display variable is used to determine source-to-target or target-to-source.
//Currently this variable is represented using 1 and 0 for now
//TODO: If we want to localize this project, wordDisplay should be able to handle more than two languages(chinese and english)
var wordDisplay
//Words learn variable is used to deterine the number paragraph(Should change the name of the variable)
var wordsLearn;

var translationUrl = 'http://wordnews-mobile.herokuapp.com/show';
//var translationUrl = "http://localhost:3000/show";

var translationType = "";
var wordsReplaced = '';
var quizType = "";
// a dictionary of english to chinese words 
var pageDictionary = {};
var vocabularyListDisplayed;
var displayID = '';

//This cont will hold all the important variable for popup
var popupDataCont = {};
var learnTypeLookup = ["view", "test"];
var learnTypeENUM = { view: 0, test: 1 };
var idToOriginalWordDictionary = {};

// a dictionary of word : times returned by server for translation
var translatedWords = {};

var pageWordsLearned = new Set();

function sendRememberWords(userID, wordID, isRemembered, url, onSuccessCallback = null) {
    $.ajax({
        type: "post",
        beforeSend: function(request) {
            request.setRequestHeader("Accept", "application/json");
        },
        url: hostUrl + '/remember',
        dataType: "json",
        data: {
            user_id: userID,
            wordID: wordID,
            isRemembered: isRemembered,
            url: url
        },
        success: function(result) {
            console.log("Remember words successful.", result);
            onSuccessCallback();
        },
        error: function(error) {
            console.log("Remember words error.");
            alert(error.responseText);
        }
    })
}

function sendUserAction(userId, elapsed_time, action, onSuccessCallback = null) {
    $.ajax({
        type: "post",
        beforeSend: function(request) {
            request.setRequestHeader("Accept", "application/json");
        },
        url: hostUrl + '/log',
        dataType: "json",
        data: {
            user_id: userID,
            time: elapsed_time,
            move: action
        },
        success: function(result) {
            console.log("Log successful.", result);
            onSuccessCallback();
        },
        error: function(error) {
            console.log("Log words error.");
            alert(error.responseText);
        }
    })
}

function requestTranslatedWords(paragraphs, translatorType, quizType) {
    console.log(paragraphs);
    var title_date = getArticleTitleAndPublicationDate();
    $.ajax({
        type: "post",
        beforeSend: function(request) {
            request.setRequestHeader("Accept", "application/json");
        },
        url: hostUrl + "/show_learn_words",
        dataType: "json",
        data: {
            paragraphs: [paragraphs],
            //TODO: It is hardcoded for now and need to check whether do we need to use wordLearn variable
            num_of_words: 1, 
            lang: userSettings.learnLanguage,
            translator: translatorType,
            user_id: userSettings.userId,
            url_postfix: getURLPostfix(window.location.href),
            url: window.location.href,
            title: title_date[0],
            publication_date: title_date[1],
            quiz_generator: quizType

        },
        success: function(result) {
            console.log("Request for tranlsated words successful.");
            console.log(JSON.stringify(result));
            translateWords(result);
        },
        error: function(error) {
            console.log("Request for tranlsated words error.");
            //alert(error.responseText);
        }
    })
}

function fb_send_recommend() {
    var title_date = getArticleTitleAndPublicationDate();
    $.ajax({
        type: "post",
        beforeSend: function(request) {
            request.setRequestHeader("Accept", "application/json");
        },
        url: hostUrl + "/auth/facebook/post_recommend",
        dataType: "json",
        data: {
            num: 1, //Hardcoded for now
            lang: userSettings.learnLanguage,
            user_id: userSettings.userId,
            url: window.location.href,
            title: title_date[0],

        },
        success: function(result) {
            //console.log(JSON.stringify(result));
            $.notify("Share successful", { globalPosition: 'top left', className: 'success'} );
        },
        error: function(error) {
            //console.log("Request for fb post recommend.");
            //alert(error.responseText);
            $.notify("Share unsuccessful", { globalPosition: 'top left', className: 'error'} );
        }

    })
}

function translateWords(result) {
    var wordsCont = result;
    replaceWords(wordsCont.words_to_learn);
}

function generateHTMLForQuiz(word, translatedWord, popupID, quiz, access) {

    var arrayShuffle = shuffle([0, 1, 2, 3]);
    var html = '<div tabindex="-1" id=\"' + popupID + '_popup\" class="jfk-bubble gtx-bubble" style="visibility: visible;  opacity: 1; padding-bottom: 40px; ">';
    html += '<a href="#" style="position: absolute; right: 8px;" id=\"' + popupID + '_close">X</a>';
    html += '<div class="jfk-bubble-content-id"><div id="gtx-host" style="min-width: 200px; max-width: 400px;">';
    html += '<div id="bubble-content" style="min-width: 200px; max-width: 400px;" class="gtx-content">';
    html += '<div id="translation" style="min-width: 200px; max-width: 400px; display: inline;">'
    //User access check: if it has access, create the four quiz buttons 
    if (access == USER_HAS_ACCESS) {

        html += '<div style="font-size: 80%;" class="gtx-language">Choose the most appropriate translation:</div>';

        for (var i = 0; i < arrayShuffle.length; ++i) {
            //Append div tag
            if (i == 0 || i == 2) {
                html += '<div style="width: 100%;">';
            }

            var num = arrayShuffle[i];

            html += '<div id="quiz_' + popupID + '_' + i + '" align="center"' +
                'onMouseOver="this.style.color=\'#FF9900\'"' +
                'onMouseOut="this.style.color=\'#626262\'" style="font-weight: bold;' +
                'cursor:pointer; color: #626262; float: left; width: 50%; padding-top:' +
                '16px;">' + quiz.choices[num] + '</div>';

            //Append the end of div tag
            if (i == 1 || i == 3) {
                html += "</div>";
            }
        }
    } else { //Render a feedback message
        html += '<div style="font-size: 80%;" class="gtx-language">You do not have enough rank to do quiz.</div>';
    }

    html += '</div></div></div></div>';
    html += '<div class="jfk-bubble-arrow-id jfk-bubble-arrow jfk-bubble-arrowup" style="left: 117px;">';
    html += '<div class="jfk-bubble-arrowimplbefore"></div>';
    html += '<div class="jfk-bubble-arrowimplafter"></div></div></div>';
    return html;
}


function playAudio(audioElem) {
    console.log("play " + audioElem.id);
    //Get audio sources from element
    var audioSources = audioElem.getElementsByTagName("source");
    var index = 1;

    //This function will auto loop to play the next track until the last one and reset it back to 0 
    var playNext = function() {
        if (index < audioSources.length) {
            audioElem.src = audioSources[index].src;
            index += 1;
            // use timeout to prevent The play() request was interrupted by a call to pause() error
            setTimeout(function() {
                audioElem.play();
            }, 10);
        } else {
            //Reset back to first audio source
            audioElem.src = audioSources[0].src;
            audioElem.pause();
            index = 1;
        }
    };
    //Add event for end of audio play to play next track
    audioElem.addEventListener('ended', playNext);
    audioElem.src = audioSources[0].src;
    setTimeout(function() {
        audioElem.play();
    }, 10);
}


//This function takes in id and wordElem and gerneate html for view popup
function generateHTMLForViewPopup(popupID, word, wordElem) {
    var html = '<div tabindex="-1" id=\"' + popupID + '_popup\" class="jfk-bubble gtx-bubble" style="visibility: visible;  opacity: 1;">';
    html += '<a href="#" style="position: absolute; right: 8px;" id=\"' + popupID + '_close">X</a>';
    html += '<div class="jfk-bubble-content-id"><div id="gtx-host" style="min-width: 200px; max-width: 400px;">';
    html += '<div id="bubble-content" style="min-width: 200px; max-width: 400px;" class="gtx-content">';
    html += '<div class="content" style="border: 0px; margin: 0">';
    html += '<div id="translation" style="min-width: 200px; max-width: 400px; display: inline;">';
    //TODO: Language is hardcoded
    html += '<div class="gtx-language">ENGLISH</div>';
    html += '<div class="gtx-body" style="padding-left:21px;">' + word + '</div><br>';
    //TODO: Language is hardcoded
    html += '<div class="gtx-language">CHINESE (SIMPLIFIED)</div>';

    html += '<div>';
    html += '<button class="audio-button" id="btn_audio_' + popupID + '"></button>';
    html += '<audio id="pronunciation_audio_' + popupID + '">';
    html += '</audio>';

    html += '<select id = "translatedSelect_' + popupID + '" style="font-size:16px; margin-right:5px"> </select>'; //translatedCharacters;            

    html += '<small id="pronunciation_' + popupID + '">' + wordElem.pronunciation + '</small> ';
    html += '</div><br>';

    html += '<div id ="vote_translation_' + popupID + '">';
    html += '<div>Is the translation accurate?</div>';
    //Accurate "Yes/No buttons"
    html += '<div id="tooltip_' + popupID + '" class="tooltip-wrapper disabled" data-title="Not enough rank to vote.">';
    html += '<button type="button" class="btn btn-success btn-sm" id="vote_yes_button_' + popupID + '" data-pair_id="' + wordElem.id + '" data-source="' + wordElem.source + '" style="margin-right:10px">Yes</button>';
    html += '<button type="button" class="btn btn-success btn-sm" id="vote_no_button_' + popupID + '" data-pair_id="' + wordElem.id + '" data-source="' + wordElem.source + '">No</button>';          
    html += '</div><br>';
    html += '</div>';
    
    html += '<div id=\"textarea_' + popupID + '\" >Input: ';
    html += '<input type="text" id="translated_text_input_' + popupID + '" style="border:1px solid black;"><br>';
    html += '<button type="button" class="btn btn-success btn-sm" id="vote_submit_button_' + popupID + '"  >Submit</button>';          
    html += '</div>';
    
    var see_more_id = "more_" + popupID;
    html += '<a id="' + see_more_id + '" target="_blank" class="More" href="' + wordElem.more_url + '" style="color: #A2A2A2; float: right; padding-top: 16px;" data-toggle="tooltip" title="Learn more about the translation">MORE »</a>';

    html += '</div></div></div></div></div>';
    html += '<div class="jfk-bubble-arrow-id jfk-bubble-arrow jfk-bubble-arrowup" style="left: 117px;">';
    html += '<div class="jfk-bubble-arrowimplbefore"></div>';
    html += '<div class="jfk-bubble-arrowimplafter"></div></div></div>';

    return html;
}

function voteTranslation(translationPairID, score, source, isExplicit) {
    $.ajax({
        type: "post",
        beforeSend: function(request) {
            request.setRequestHeader("Accept", "application/json");
        },
        url: hostUrl + '/vote',
        dataType: "json",
        data: {
            translation_pair_id: translationPairID,
            user_id: userSettings.userId,
            score: score,
            source: source,
            is_explicit: isExplicit
        },
        success: function(result) {
            console.log("vote successful.");
            updateScoreAndRank(result.user.score, result.user.rank)

        },
        error: function(error) {
            console.log("vote error.");
        }
    });
}

function replaceWords(wordsCont) {
    var paragraphs = getParagraphs();

    for (var i = 0; i < wordsCont.length; ++i) {
        var wordElem = wordsCont[i];
        var wordLowerCase = wordElem.text.toLowerCase();
        //We only need to translate the same word once, therefore, 
        //translatedWords will be a global container to keep track of the number times the translated word appear.        
        translatedWords[wordLowerCase] = wordElem.text in translateWords ? translatedWords[wordLowerCase] + 1 : 1;

        if (translatedWords[wordLowerCase] >= 2) {
            continue;
        }

        var paragraph = paragraphs[wordElem.paragraph_index];
        var text = paragraph.innerHTML;
        //Set learnType to a int
        var learnType = wordElem.learn_type == "view" ? learnTypeENUM.view : learnTypeENUM.learn;
        var popupID = wordElem.text + '_' + wordElem.word_id + '_' + wordElem.paragraph_index + '_' + learnType;

        var pronunciation = wordElem.pronunciation.replace('5', '');

        //Create a map to store popup data
        var popupData = {
            html: "",
            clickCounter: 0,
            word: wordElem.text,
            type: 0,
            pairID: wordElem.pair_id,
            paragraphIndex: wordElem.paragraph_index,
            wordIndex: wordElem.word_index,
            translatedWordIndex: 0,
            translatedWords: [],
            quiz: []
        };

        //Create a map to store all the translated words
        var translatedWordsCont = [];
        //Push machine translation into translated word container
        translatedWordsCont.push({
            id: wordElem.machine_translation_id,
            translation: wordElem.translation,
            pronunciation: pronunciation,
            audio_urls: wordElem.audio_urls,
            source: 0, //machine 
            vote: wordElem.vote,
            more_url: wordElem.more_url
        });

        var joinString = '';
        joinString += '<span ';
        joinString += 'class = "translate_class" ';
        joinString += 'style="text-decoration:underline; font-weight: bold; "';
        joinString += 'data-placement="above" ';

        //If it is view mode
        if (learnType == learnTypeENUM.view) {

            //In learn mode, there will be annotation property in wordElem.
            //Therefore, we need to insert all the different translation avaialble into a container and sort the ranking
            for (var annotationIndex = 0; annotationIndex < wordElem.annotations.length; ++annotationIndex) {
                translatedWordsCont.push({
                    id: wordElem.annotations[annotationIndex].id,
                    translation: wordElem.annotations[annotationIndex].translation,
                    pronunciation: wordElem.annotations[annotationIndex].pronunciation,
                    audio_urls: wordElem.annotations[annotationIndex].audio_urls,
                    source: 1, //user/human 
                    vote: wordElem.annotations[annotationIndex].vote
                })
            }

            //Sort the translated words in decreasing order according to vote
            function compare(lhs, rhs) {
                if (lhs.vote < rhs.vote) {
                    return -1;
                }

                if (lhs.vote > rhs.vote) {
                    return 1;
                }
                return 0;
            }
            translatedWordsCont.sort(compare);
        } else {
            popupData.type = 1;
            popupData.quiz = wordElem.quiz;
        }
        joinString += 'id = "' + popupID + '" >';

        //wordDisplay is a variable to determine target-to-source or source-to-target
        if (wordDisplay == 1) {
            joinString += wordElem.text;
        } else {
            joinString += wordElem.translation;
        }
        joinString += '</span> ';

        var parts = text.split(new RegExp('\\b' + wordElem.text + '\\b'));
        var result = '';
        if (parts.length > 1) {
            var n = occurrences(parts[0], '\"');
            result += parts[0] + joinString;
            parts.splice(0, 1);
        }

        result += parts.join(' ' + wordElem.text + ' ');
        //Create the inner html for highlighted/underlined translated text
        paragraph.innerHTML = result;

        //add popup data to container
        popupData.translatedWords = translatedWordsCont;
        popupDataCont[popupID] = popupData;
    }

    $(".translate_class").off('click.wordnews').on('click.wordnews', appendPopUp);

    $('.translate_class').mouseover(function() {
        $(this).css("color", "#FF9900");
        $(this).css("cursor", "pointer");
    });

    $('.translate_class').mouseout(function() {
        $(this).css("color", "black");
    });
}


function validateQuizInput(popupID, input) {
    var popupData = popupDataCont[popupID];
    var answer = popupData.word;
    //Add the quiz answer into event log
    addDetail(popupID, "answer", answer);
    //Send ajax post /log
    sendLog(getEventLog(popupID));

    //Can be changed to number
    var isCorrect = (answer == input) ? "correct" : "wrong";
    //Send ajax post /take_quiz 
    $.ajax({
            type: "post",
            beforeSend: function(request) {
                request.setRequestHeader("Accept", "application/json");
            },
            url: hostUrl + '/take_quiz',
            dataType: "json",
            data: {
                user_id: userSettings.userId,
                translation_pair_id: popupData.pairID,
                answer: isCorrect,
                lang: userSettings.learnLanguage
            },
            success: function(result) {
                console.log("take quiz successful.", result);
                updateScoreAndRank(result.user.score, result.user.rank)

            },
            error: function(error) {
                console.log("take quiz error.");
            }
        })
        //TODO: This way of changing the backgroud image is wrong
    if (isCorrect == "correct") {
        $('.jfk-bubble').css("background-image", "url('https://lh4.googleusercontent.com/-RrJfb16vV84/VSvvkrrgAjI/AAAAAAAACCw/K3FWeamIb8U/w725-h525-no/fyp-correct.jpg')");
        $('.jfk-bubble').css("background-size", "cover");
        $('.content').css("background-color", "#cafffb");
        popupData.html = generateHTMLForViewPopup(popupID, answer, popupData.translatedWords[popupData.translatedWordIndex]);
        popupData.type = 0;
        //$('#'+popupID+'_popup').fadeOut(300);
    } else {
        $('.jfk-bubble').css("background-image", "url('https://lh6.googleusercontent.com/--PJRQ0mlPes/VSv52jGjlUI/AAAAAAAACDU/dU3ehfK8Dq8/w725-h525-no/fyp-wrong.jpg')");
        $('.jfk-bubble').css("background-size", "cover");
    }
}

//This function is called when "translated word"(underlined) being clicked. 
//It will insert the html generated by the respective functions
//After the HTML is inserted, it will set up needed event listener for the buttons and links
function appendPopUp(event) {
    var id = $(this).attr('id');

    var element = document.getElementById(id);
    var rect = cumulativeOffset(element);
    
    displayID = id + "_popup";
    var myElem = document.getElementById(displayID);
    if (myElem != null) {
        document.body.removeChild(myElem);
    }
    var popupData = popupDataCont[id];
    if (popupData.type == 0) {
        //If the translated word has not been clicked yet, send ajax post to server 
        if (popupData.clickCounter == 0) {
            //Send ajax post /view 
            $.ajax({
                type: "post",
                beforeSend: function(request) {
                    request.setRequestHeader("Accept", "application/json");
                },
                url: hostUrl + '/view',
                dataType: "json",
                data: {
                    translation_pair_id: popupData.pairID,
                    user_id: userSettings.userId,
                    lang: userSettings.learnLanguage
                },
                success: function(result) {

                    console.log("view successful.");
                    updateScoreAndRank(result.user.score, result.user.rank)

                },
                error: function(error) {
                    console.log("view error.");
                }
            });
        }

        ++popupData.clickCounter;

        //Create an event log to store event details of "view"
        createEventLog(id, userSettings.userId, "view", "start_view");
        //Generate html for view popup
        popupData.html = generateHTMLForViewPopup(id, popupData.word, popupData.translatedWords[0]);
        $('body').append(popupData.html);
        //Get select translated character elem    
        var translatedCharSelectElem = document.getElementById('translatedSelect_' + id);
        
        //Variable to hold the user rank result
        var result = USER_RANK_INSUFFICIENT;
        result = checkRankAndLogin(rankAccess.VIEW_HUMAN_ANNOTATION);

        //Determine the length of translation words to display
        var lenOfTranslatedWords = result < 0 ? 1 : popupData.translatedWords.length;

        //Create the list of translated words according to votes
        for (var i = 0; i < lenOfTranslatedWords; ++i) {
            var opt = document.createElement('option');
            opt.value = i;
            opt.innerHTML = popupData.translatedWords[i].translation;
            translatedCharSelectElem.appendChild(opt);
        }

        //Get Audio elem
        var audioElem = document.getElementById('pronunciation_audio_' + id);
        var audio_urls = popupData.translatedWords[popupData.translatedWordIndex].audio_urls;
        appendAudioUrls(audioElem, audio_urls);

        //Add event listener for playing the audio
        var audioButtonElement = document.getElementById('btn_audio_' + id);
        audioButtonElement.addEventListener('click', function() {
            playAudio(audioElem);
            //Log down the event
            newEvent(id, "Click on audio");
        });


        //Add event listener for select onchange to update the other html elem
        translatedCharSelectElem.addEventListener("change", function() {
            popupData.translatedWordIndex = translatedCharSelectElem.selectedIndex;
            //set audio urls
            appendAudioUrls(audioElem, popupData.translatedWords[popupData.translatedWordIndex].audio_urls);
            //audioElem.src = popupData.translatedWords[popupData.translatedWordIndex].audio_urls[0];
            var pronunciationElem = document.getElementById('pronunciation_' + id);
            pronunciationElem.value = popupData.translatedWords[popupData.translatedWordIndex].pronunciation;
            
            voteTranslation(popupData.translatedWords[popupData.translatedWordIndex].id, 1, popupData.translatedWords[popupData.translatedWordIndex].source, 0);
        });


        //Setting up onclick function for the vote buttons
        var voteYesBtnElem = document.getElementById('vote_yes_button_' + id);
        var voteNoBtnElem = document.getElementById('vote_no_button_' + id);

        $('#tooltip_' + id).tooltip();
        
        //Get the text area
        var textAreaDiv = document.getElementById('textarea_' + id);
        textAreaDiv.style.display ='none';
        
        result = checkRankAndLogin(rankAccess.VOTE_TRANSLATIONS);
        
        if (result == 0) {
            //Add onclick event for yes button
            voteYesBtnElem.addEventListener("click", function() {
                voteTranslation(popupData.translatedWords[popupData.translatedWordIndex].id, 1, popupData.translatedWords[popupData.translatedWordIndex].source, 1);
                newEvent(id, "Click on yes");
            });
            //Add onclick event for no button
            voteNoBtnElem.addEventListener("click", function() {
                voteTranslation(popupData.translatedWords[popupData.translatedWordIndex].id, -1, popupData.translatedWords[popupData.translatedWordIndex].source, 1);
                newEvent(id, "Click on no");
                //Hide the vote translation div 
                var voteTranslationDiv = document.getElementById('vote_translation_' + id);
                voteTranslationDiv.style.display ='none';
                //Unhide textbox to allow user to input their annotation                                    
                textAreaDiv.style.display ='block';                
            });          
                        
            var translatedTextInput = document.getElementById('translated_text_input_' + id);
            //Check for any input in the textbox
            translatedTextInput.addEventListener('keyup', function() {                    
                //If the length of text is more than 0, enable submit button
                var voteSubmitButton = document.getElementById('vote_submit_button_' + id);;
                voteSubmitButton.disabled = !(this.value.length > 0);
                
            });
          
            var voteSubmitButton = document.getElementById('vote_submit_button_' + id);
            //Disable the button as default 
            voteSubmitButton.disabled = true;
            //When user keys his own translation, send an create_annotation API with respective data
            //
            voteSubmitButton.addEventListener("click", function () {
                $.ajax({
                    type : "post",
                    beforeSend : function(request) {
                        request.setRequestHeader("Accept", "application/json");
                    },
                    url : hostUrl + "/create_annotation",
                    dataType : 'json',
                    data : {
                        annotation: {
                            ann_id: generateId(), //This is popup panel id
                            user_id: userSettings.userId,
                            selected_text: popupData.word,
                            translation: translatedTextInput.value,
                            lang: userSettings.learnLanguage,
                            url: window.location.href,
                            url_postfix: getURLPostfix(window.location.href),
                            website: website,
                            paragraph_idx: popupData.paragraphIndex,
                            text_idx: popupData.wordIndex

                        }   
                    },
                    success : function(result) { // post successful and result returned by server
                        console.log( "add annotaiton post success", result );          
                        
                        //Change the state of the annotation from new to existed
                        var panelID  = annotationPanelID + "_panel";
                        $('#' + panelID).data('state', annotationState.EXISTED);
                        $('#' + panelID).data('id', result.id); // add the annotation id from server
                    },

                    error : function(result) {
                        console.log("add annotation post error", result);
                    }
                });
            });
        }
            
    } else { // Quiz
    var result = checkRankAndLogin(rankAccess.VIEW_MACHINE_TRANSLATION);
    popupData.html = generateHTMLForQuiz(popupData.word, popupData.translation, id, popupData.quiz, result);
    //Append the html to the body
    $('body').append(popupData.html);
    if (result == USER_HAS_ACCESS) {

        //Create an event log for take quiz
        createEventLog(id, userSettings.userId, "take_quiz", "start_quiz");

        //Create a variable to hold all the information for the choices
        var choicesInfo = [];

        //4 is hardcoded
        for (var i = 0; i < 4; ++i) {
            var elem = document.getElementById('quiz_' + id + '_' + i);

            choicesInfo.push(i + "_" + elem.innerHTML);

            // Add an event listener for on click
            elem.addEventListener("click", function() {

                var quizOptionID = $(this).attr('id');
                var splitQuiz = quizOptionID.split("_");
                var index = splitQuiz[splitQuiz.length - 1];
                var input = this.innerHTML;
                //Create 
                newEvent(id, "Click on " + index + ": " + input);
                console.log(input);
                validateQuizInput(id, input);
            });

            // Add an event listen for hover/mouse over
            elem.addEventListener("mouseover", function() {

                var quizOptionID = $(this).attr('id');
                var input = this.innerHTML;
                var splitQuiz = quizOptionID.split("_");
                var index = splitQuiz[splitQuiz.length - 1];
                //Create 
                newEvent(id, "Hover over on " + index + ": " + input);

            });
        }
        //Add additional information for the event log
        addDetail(id, "choices", choicesInfo);
    }
}

var elem = document.getElementById(id + '_popup');
elem.style.left = (rect.left - 100) + 'px';

$('#' + displayID).fadeIn(300, function() {
    //$(this).focus();
});

$('#' + id + '_close').bind('click', function(e) {
    // Prevents the default action to be triggered. 
    e.preventDefault();
    $('#' + displayID).fadeOut(300);
    newEvent(id, "close");

    sendLog(getEventLog(id));
});

//$('#' + displayID).on('blur', function() {
//    $(this).fadeOut(300);
//    newEvent(id, "close");
//
//    sendLog(getEventLog(id));
//})

//Add an event to close the translation/quiz popup
//document.addEventListener("click", function (event) {  
//    console.log("hide panel")
//    elem.style.visibility = "hidden";
//}, true);        

// Fix left overflow out of screen
if (rect.left - 100 < 0) {
    document.getElementById(id + '_popup').style.left = '0';
}
// TODO: Fix right overflow out of screen with screenWidth
document.getElementById(id + '_popup').style.top = (rect.top + 30) + 'px';
}


function appendAudioUrls(audioElement, urls) {
    // remove existing source elements
    $(audioElement).remove("source");
    // create and append new source elements
    for (var i = 0; i < urls.length; i++) {
        var source = document.createElement("source");
        source.setAttribute("src", urls[i]);
        audioElement.appendChild(source);
    }
}

vocabularyListDisplayed = 0;



function preproccessParagraph(paragraph) {
    //paragraph = paragraph.replace("\n", " ");
    return paragraph.replace(/[^\x00-\x7F]/g, " ");
}


function beginTranslating() {

    var isWebsiteForTranslation = 0;

    //Iterate website setting to check whehter the current URL is eligible for translation
    for (var k = 0; k < userSettings.websiteSetting.length; k++) {
        var website = websiteSettingLookupTable[userSettings.websiteSetting[k]];
        if (document.URL.indexOf(website) !== -1) {
            isWebsiteForTranslation = 1;
        }
    }

    console.log('websiteCheck ' + isWebsiteForTranslation);

    if (isWebsiteForTranslation) {
        // request at the start
        //Notification.requestPermission();
        //spawnNotification(null, null, 'WordNews is replacing some words in this article');
        $(window).scroll(function() {
            // if the user scrolls to the button of the page, display the list of words learned
            if ($(window).scrollTop() + $(window).height() === $(document).height() - 300) {
                var wordList = [];

                for (var key of pageWordsLearned) {
                    var value = idToOriginalWordDictionary[key];
                    wordList.push(value.toLowerCase());
                }

                var titleOfNotification = 'Words looked at in this article:';
                //if (wordList) {
                //    spawnNotification(wordList.join(', '), null, titleOfNotification);
                //}
            }
        });
        
        //Need to randomly select paragraphs and use "wordsLearn" variable from tab settings
        //to control the number of words needed to be learn
        var paragraphs = getParagraphs();
        //Get the number of paragraphs in the article
        var numberOfParagrpahs = paragraphs.length;        
        //Create a random index array 
        var randomIndexArray = new Array(numberOfParagrpahs);
        for (var i = 0; i < numberOfParagrpahs; ++i) {
            randomIndexArray[i] = i;
        }
        //Shuffle the array
        randomIndexArray = shuffle(randomIndexArray);        
        //wordsLearn variable will be used to limit the number of paragraphs send to server
        for (var i = 0; i < wordsLearn; i++) {
            var index = randomIndexArray[i];
            var paragraph = paragraphs[index];
            var text = preproccessParagraph(paragraph.innerText);
            if (text.split(' ').length >= 10) {
                requestTranslatedWords({ paragraph_index: index, text: text }, translationType, quizType);
            }
            //console.log("Before: " + paragraph.innerText);
            //console.log("After: " +  paragraph.innerText.replace(/[^\x00-\x7F]/g, " ")); //encodeURIComponent(paragraph.innerText));

        }
    }
};

function shuffle(o) { //v1.0
    for (var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};

function occurrences(string, substring) {
    var n = 0;
    var pos = 0;
    var l = substring.length;

    while (true) {
        pos = string.indexOf(substring, pos);
        if (pos > -1) {
            n++;
            pos += l;
        } else {
            break;
        }
    }
    return (n);
}

//this is test on 2015/3/6
var cumulativeOffset = function(element) {

    var top = 0,
        left = 0;
    do {
        top += element.offsetTop || 0;
        left += element.offsetLeft || 0;
        element = element.offsetParent;
    } while (element);

    return {
        top: top,
        left: left
    };
};

// creates a notification
function spawnNotification(bodyOfNotification, iconOfNotification, titleOfNotification) {
    var actualBody = bodyOfNotification ? bodyOfNotification : '';
    var options = {
        body: actualBody,
        icon: iconOfNotification
    }
    var n = new Notification(titleOfNotification, options);
    window.setTimeout(function() { n.close(); }, 5000);
}
