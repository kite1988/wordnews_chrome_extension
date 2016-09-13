'use strict';

// TODO: move into UserSettings
var categoryParameter = '';
var wordDisplay;

var translationUrl = 'http://wordnews-mobile.herokuapp.com/show';
//var translationUrl = "http://localhost:3000/show";


var TranslationDirection = {
    CHINESE: 0,
    ENGLISH: 1
};
var isTranslatingByParagraph = true;

var learnLanguage = 'zh_CN';

var wordsReplaced = '';
// a dictionary of english to chinese words 
var pageDictionary = {};
var vocabularyListDisplayed;
var displayID = '';


var popupDataCont = {};

var learnTypeLookup = ["view", "test"];
var learnTypeENUM = {view: 0, test: 1};
var idToOriginalWordDictionary = {};


// a dictionary of word : times returned by server for translation
var translatedWords = {};

var pageWordsLearned = new Set();

// startTime is used for logging, it is initialised after the user settings have been 
// retrieved from chrome
var startTime;

function sendRememberWords(userID, wordID, isRemembered, url, onSuccessCallback = null) {
    
    $.ajax({
        type: "post",
        beforeSend : function (request) {
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
        success: function (result) {
            console.log("Remember words successful.", result);
            onSuccessCallback();
        },
        error: function (error) {
            console.log("Remember words error.");
            alert(error.responseText);
        }        
    })
    
    //var params = 'user_id=' + userSettings.userId + '&wordID=' + tempWordID + '&isRemembered=' + isRemembered + '&url=' + encodeURIComponent(url);
    //var httpClient = new HttpClient();
    //
    //httpClient.post(hostUrl + '/remember', params, onSuccessCallback);
}

function sendUserAction(userId, elapsed_time, action, onSuccessCallback = null) {
    $.ajax({
        type: "post",
        beforeSend : function (request) {
            request.setRequestHeader("Accept", "application/json");
        },
        url: hostUrl + '/log',
        dataType: "json",
        data: {
            user_id: userID,
            time: elapsed_time,
            move: action,
            
        },
        success: function (result) {
            console.log("Log successful.", result);
            onSuccessCallback();
        },
        error: function (error) {
            console.log("Log words error.");
            alert(error.responseText);
        }        
    })
}

function requestTranslatedWords(paragraphs, translatorType) {
    console.log(paragraphs);
    var title_date = getArticleTitleAndPublicationDate();
    $.ajax({
        type: "post",
        beforeSend : function (request) {
            request.setRequestHeader("Accept", "application/json");
        },
        url: hostUrl + "/show_learn_words",
        dataType: "json",
        data: {
            paragraphs: [paragraphs],
            num_of_words: 1, //Hardcoded for now
            lang: learnLanguage,
            translator: translatorType,
            user_id: userSettings.userId,
            url_postfix: getURLPostfix(window.location.href),
            url: window.location.href,
            title: title_date[0],
            publication_date: title_date[1]
            
        },
        success: function (result) {
            console.log("Request for tranlsated words successful.");
            translateWords(result);
        },
        error: function (error) {
            console.log("Request for tranlsated words error.");
            //alert(error.responseText);
        }
        
    })
}

function translateWords (result) {
    
    var wordsCont = result;
    replaceWords(wordsCont.words_to_learn);
    
}

//TODO: Need to remove this hardcoded const variable and change to a more scalable method
const CHINESE_TO_ENGLISH_QUIZ = 1;
const ENGLISH_TO_CHINESE_QUIZ = 2;
    
function generateHTMLForQuiz(word, translatedWord, popupID, quiz) {
    
    var arrayShuffle = shuffle([0, 1, 2, 3]);
    var html = '<div id=\"' + popupID + '_popup\" class="jfk-bubble gtx-bubble" style="visibility: visible;  opacity: 1; padding-bottom: 40px; ">';
    html += '<div class="jfk-bubble-content-id"><div id="gtx-host" style="min-width: 200px; max-width: 400px;">';
    html += '<div id="bubble-content" style="min-width: 200px; max-width: 400px;" class="gtx-content">'; 
    html += '<div id="translation" style="min-width: 200px; max-width: 400px; display: inline;">'
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
    html += '</div></div></div></div>' + '<div class="jfk-bubble-arrow-id jfk-bubble-arrow jfk-bubble-arrowup" style="left: 117px;">';
    html += '<div class="jfk-bubble-arrowimplbefore"></div>'; 
    html += '<div class="jfk-bubble-arrowimplafter"></div></div></div>';
    return html;
}

//This function takes in id and wordElem and gerneate html for view popup
function generateHTMLForViewPopup(popupID, word, wordElem) {
    var html = '<div id=\"' + popupID + '_popup\" class="jfk-bubble gtx-bubble" style="visibility: visible;  opacity: 1;">';
    html += '<div class="jfk-bubble-content-id"><div id="gtx-host" style="min-width: 200px; max-width: 400px;">';
    html += '<div id="bubble-content" style="min-width: 200px; max-width: 400px;" class="gtx-content">';
    html += '<div class="content" style="border: 0px; margin: 0">';
    html += '<div id="translation" style="min-width: 200px; max-width: 400px; display: inline;">';
    //TODO: Language is hardcoded
    html += '<div class="gtx-language">ENGLISH</div>';
    html += '<div class="gtx-body" style="padding-left:21px;">' + word + '</div><br>';
    //TODO: Language is hardcoded
    html += '<div class="gtx-language">CHINESE (SIMPLIFIED) <span style ="color:red;">Accurate?</span></div>';
    
    html += '<p style = "margin: 0px;padding-left:10px;">';
    //"audio speaker" image
    html += '<img style="height:21px;width:21px;display:inline-block;opacity:0.55;vertical-align:middle;background-size:91%;-webkit-user-select: none;-webkit-font-smoothing: antialiased;" class="audioButton"  src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAQAAABKfvVzAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAACjSURBVDjLY2AYYmA1QwADI3FKy8HkfyA8zqBOjPL/YLqO4SWQ9YXBmbDy/1C2EMMGsBZNQsr/w/lMDCuAvKOElP+HeloQSPIxPAPynVAV/seAENHtYLoKyJpDnIb/DOZA2gBI3yRWQx6Q5gZ7nFYaQE4yJN5JW8B0PaanYaADRcMaBh5wsD7HDFZMLURGHEIL0UkDpoWExAfRQlLyJiMDDSAAALgghxq3YsGLAAAAAElFTkSuQmCC" >'
    html += '<select id = "translatedSelect_' + popupID + '" style="font-size:16px"> </select>';//translatedCharacters;            
    
    //Accurate "Yes/No buttons"
    html += '<button class="button" id="vote_yes_button_' + popupID + '" data-pair_id="'+ wordElem.id + '" data-source="' + wordElem.source + '" style="background-color: #4CAF50; border-radius: 5px; border: none; font-size:16px; padding: 10px 24px;">Yes</button>';
    html += '<button class="button" id="vote_no_button_' + popupID +  '" data-pair_id="'+ wordElem.id + '" data-source="' + wordElem.source + '" style="background-color: #4CAF50; border-radius: 5px; border: none; font-size:16px; padding: 10px 24px;">No</button>';
   
    html += '<div class="row" style="margin-left:10px">';
    html += '<small id="pronunciation_' + popupID + '">' + wordElem.pronunciation + '</small> ';

    html += '</div>';
    
    //Audio bar div
    html += '<div class="row" >';
    html += '<audio id="pronunciation_audio_' + popupID + '" controls="" autoplay="">'
         
    html += '</audio>';
    html += '</div>';
    //End of audio bar div
    
    var see_more_id = "more_" + popupID;
    html += '</p>';
    //TODO: href is hardcoded
    html += '<a id="' + see_more_id + '" target="_blank" class="More" href="http://dict.cn/en/search?q=' + word + '" style="color: #A2A2A2; float: right; padding-top: 16px;">MORE »</a>';
    html += '</div></div></div></div></div>';
    html += '<div class="jfk-bubble-arrow-id jfk-bubble-arrow jfk-bubble-arrowup" style="left: 117px;">';
    html += '<div class="jfk-bubble-arrowimplbefore"></div>';
    html += '<div class="jfk-bubble-arrowimplafter"></div></div></div>';
    
    return html;
}


function voteTranslation(translationPairID, score, source, isExplicit) {
    $.ajax({
        type: "post",
        beforeSend : function (request) {
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
        success: function (result) {
            console.log("vote successful.", result);
            
        },
        error: function (error) {
            console.log("vote error.");
            
        }        
    })
}
    
function replaceWords (wordsCont) {
    var paragraphs = paragraphsInArticle();
    
    for (var i = 0; i < wordsCont.length; ++i) {
        var wordElem = wordsCont[i];
        var wordLowerCase = wordElem.text.toLowerCase();
        //We only need to translate the same word once, therefore, 
        //translatedWords will be a global container to keep track of the number times the translated word appear.        
        translatedWords[wordLowerCase] =  wordElem.text in translateWords ? translatedWords[wordLowerCase] + 1 : 1;
        
        if (translatedWords[wordLowerCase] >= 2) {
            continue;
        }    
        
        var paragraph = paragraphs[wordElem.paragraph_index];
        var text = paragraph.innerHTML;    
        //Set learnType to a int
        var learnType = wordElem.learn_type == "view" ? 0 : 1;
        var popupID =  wordElem.text + '_' + wordElem.word_id + '_' + wordElem.paragraph_index + '_' + learnType;
                
        var pronunciation = wordElem.pronunciation.replace('5', '');
        
        //Create a map to store popup data
        var popupData = {html: "", clickCounter: 0, word: wordElem.text, type: 0, pairID: wordElem.pair_id, translatedWordIndex: 0, translatedWords : []}; 
        
        //Create a map to store all the translated words
        var translatedWordsCont = [];
        //Push machine translation into translated word container
        translatedWordsCont.push({ id: wordElem.machine_translation_id, 
                                  translation: wordElem.translation, 
                                  pronunciation: pronunciation,
                                  audio_urls: wordElem.audio_urls, 
                                  source: 0,//machine 
                                  vote: wordElem.vote})
        
        var joinString = '';
        joinString += '<span ';
        joinString += 'class = "translate_class" ';
        joinString += 'style="text-decoration:underline; font-weight: bold; "';
        joinString += 'data-placement="above" ';
        
        //If it is view mode
        if (learnType == 0) {
            
            //In learn mode, there will be annotation property in wordElem.
            //Therefore, we need to insert all the different translation avaialble into a container and sort the ranking
            for (var annotationIndex = 0; annotationIndex < wordElem.annotations.length; ++annotationIndex) {
                translatedWordsCont.push({  id: wordElem.annotations[annotationIndex].id, 
                                            translation: wordElem.annotations[annotationIndex].translation, 
                                            pronunciation: wordElem.annotations[annotationIndex].pronunciation,
                                            audio_urls: wordElem.annotations[annotationIndex].audio_urls, 
                                            source: 1,//user/human 
                                            vote: wordElem.annotations[annotationIndex].vote })
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
            popupData.html = generateHTMLForViewPopup(popupID, wordElem.text, translatedWordsCont[0]);
            
        } else {
            popupData.type = 1;
            //TODO: Need to make this more generic
            if (wordElem.testType === CHINESE_TO_ENGLISH_QUIZ) {
                joinString += 'title="Which of the following is the corresponding English word?" ';
            } else if (wordElem.testType === ENGLISH_TO_CHINESE_QUIZ) {
                joinString += 'title="Which of the following is the corresponding Chinese word?" ';
            }
            joinString += 'href="#" ';          
            popupData.html = generateHTMLForQuiz(wordElem.text, wordElem.translation, popupID, wordElem.quiz);
        }
        joinString += 'id = "' + popupID + '" >';
            
        //TODO: Check what is wordDisplay for
        if (wordDisplay == 1) {
            joinString += wordElem.text;
        } else {
            joinString += wordElem.translation;
        }
        joinString += '</span> ';        
        
        $(document).off('click.wordnews').on('click.wordnews', "input[name*='inlineRadioOptions']", documentClickOnInlineRadioButton);

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


function documentClickOnInlineRadioButton() {
    var id = $(this).attr('id');
    var tempWordID = $(this).attr('value').split('_')[0];

    document.getElementById('inlineRadio1').disabled = true;
    document.getElementById('inlineRadio2').disabled = true;
    document.getElementById('inlineRadio3').disabled = true;
    document.getElementById('inlineRadioCorrect').disabled = true;

    if (document.getElementById('inlineRadioCorrect').checked) {
        sendRememberWords(userSettings.userId, tempWordID, 1, document.URL);
        document.getElementById('alertSuccess').style.display = 'inline-flex';
        setTimeout(function() { $('.translate_class').popover('hide') }, 1000);
    } else {
        sendRememberWords(userSettings.userId, tempWordID, 0, document.URL);
        document.getElementById('alertDanger').style.display = 'inline-flex';
        setTimeout(function() { $('.translate_class').popover('hide') }, 2500);
    }
}

function validateQuizInput(popupID, input) {
    var popupData = popupDataCont[popupID];
    var answer = popupData.word;
    //Can be changed to number
    var isCorrect =  (answer == input) ? "correct" : "wrong";
    //Send ajax post /take_quiz 
    $.ajax({
        type: "post",
        beforeSend : function (request) {
            request.setRequestHeader("Accept", "application/json");
        },
        url: hostUrl + '/take_quiz',
        dataType: "json",
        data: {
            user_id: userSettings.userId,
            translation_pair_id: popupData.pairID,            
            answer: isCorrect,
            lang: learnLanguage
        },
        success: function (result) {
            console.log("take quiz successful.", result);   
            popupData.html = generateHTMLForViewPopup(popupID, answer, popupData.translatedWords[popupData.translatedWordIndex]);
        },
        error: function (error) {
            console.log("take quiz error.");            
        }        
    })
    
    if (isCorrect == "correct") {
        $('.jfk-bubble').css("background-image", "url('https://lh4.googleusercontent.com/-RrJfb16vV84/VSvvkrrgAjI/AAAAAAAACCw/K3FWeamIb8U/w725-h525-no/fyp-correct.jpg')");
        $('.jfk-bubble').css("background-size", "cover");
        $('.content').css("background-color", "#cafffb");
    }
    else {
        $('.jfk-bubble').css("background-image", "url('https://lh6.googleusercontent.com/--PJRQ0mlPes/VSv52jGjlUI/AAAAAAAACDU/dU3ehfK8Dq8/w725-h525-no/fyp-wrong.jpg')");
        $('.jfk-bubble').css("background-size", "cover");
    }
}

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
    $('body').append(popupData.html);
    //If the translated word has not been clicked yet, send ajax post to server 
    if (popupData.clickCounter == 0) {
        //Send ajax post /view 
        $.ajax({
            type: "post",
            beforeSend : function (request) {
                request.setRequestHeader("Accept", "application/json");
            },
            url: hostUrl + '/view',
            dataType: "json",
            data: {
                translation_pair_id: popupData.pairID,
                user_id: userSettings.userId,
                lang: learnLanguage
            },
            success: function (result) {
                console.log("view successful.", result);
                
            },
            error: function (error) {
                console.log("view error.");            
            }        
        })     
        
    }
    ++popupData.clickCounter;
    if (popupData.type == 0)    {
        //Get select translated character elem    
        var translatedCharSelectElem = document.getElementById('translatedSelect_' + id);
        
        //Create the list of translated words according to votes
        for (var i = 0; i < popupData.translatedWords.length; ++i) {
            var opt = document.createElement('option');
            opt.value = i;
            opt.innerHTML = popupData.translatedWords[i].translation;
            translatedCharSelectElem.appendChild(opt);
        }    
            
        //Get Audio elem
        var audioElem = document.getElementById('pronunciation_audio_' + id);
        //Get audio sources from element
        var audioSources =  audioElem.getElementsByTagName("source");
        var index = 1;
        //This function will auto loop to play the next track until the last one and reset it back to 0 
        var playNext = function() {
            if(index <  popupData.translatedWords[popupData.translatedWordIndex].audio_urls.length) {            
                audioElem.src = popupData.translatedWords[popupData.translatedWordIndex].audio_urls[index];
                index += 1;
            } else {
                //Reset back to first audio source
                audioElem.src = popupData.translatedWords[popupData.translatedWordIndex].audio_urls[0];
                audioElem.pause();            
                index = 1;            
            }
        };
        //Add event for end of audio play to play next track
        audioElem.addEventListener('ended', playNext);    
        audioElem.src = popupData.translatedWords[popupData.translatedWordIndex].audio_urls[0];
        
        //Add event listener for select onchange to update the other html elem
        translatedCharSelectElem.addEventListener("change", function() {
            popupData.translatedWordIndex = translatedCharSelectElem.selectedIndex;
            //set audio urls
            audioElem.src = popupData.translatedWords[popupData.translatedWordIndex].audio_urls[0];
            var pronunciationElem = document.getElementById('pronunciation_' + id);
            pronunciationElem.value = popupData.translatedWords[popupData.translatedWordIndex].pronunciation;
        });
        
        //Setting up onclick function for the vote buttons
        var voteYesBtnElem = document.getElementById('vote_yes_button_' + id);
        var voteNoBtnElem = document.getElementById('vote_no_button_' + id);
        
        //Add onclick event for yes button
        voteYesBtnElem.addEventListener("click", function () {        
            voteTranslation(popupData.translatedWords[popupData.translatedWordIndex].id, 1, popupData.translatedWords[popupData.translatedWordIndex].source, 1);
        });
        //Add onclick event for no button
        voteNoBtnElem.addEventListener("click", function () {        
            voteTranslation(popupData.translatedWords[popupData.translatedWordIndex].id, -1, popupData.translatedWords[popupData.translatedWordIndex].source, 1);
        });
    } 
    else {
        //4 is hardcoded
        for (var i = 0; i < 4; ++i) {
            var  elem = document.getElementById('quiz_' + id + '_' + i);
            var input = elem.innerHTML;
            elem.addEventListener("click", function () {        
                validateQuizInput(id, input);
            });
        }        
    }
    
    var elem = document.getElementById(id + '_popup'); 
    elem.style.left = (rect.left - 100) + 'px';   
    
    //Add an event to close the translation/quiz popup
    document.addEventListener("click", function (event) {  
        console.log("hide panel")
        elem.style.visibility = "hidden";
    }, true);        

    // Fix left overflow out of screen
    if (rect.left - 100 < 0) {
        document.getElementById(id + '_popup').style.left = '0';
    }
    // TODO: Fix right overflow out of screen with screenWidth
    document.getElementById(id + '_popup').style.top = (rect.top + 30) + 'px';
}

vocabularyListDisplayed = 0;

function paragraphsInArticle() {
    var paragraphs;
    if (document.URL.indexOf('cnn.com') !== -1) {
        paragraphs = $('.zn-body__paragraph').get();
    } else {
        paragraphs = document.getElementsByTagName('p');
    }
    return paragraphs;
}

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
                var wordList = [];//TODO: word list is not being used

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

        var paragraphs = paragraphsInArticle();
        
        var articleText = "";
        for (var i = 0; i < paragraphs.length; i++) {
            var paragraph = paragraphs[i];
            var text = preproccessParagraph(paragraph.innerText);
            if (text.split(' ').length >= 10  )
            {
                requestTranslatedWords({ paragraph_index : i,  text: text }, "dict");
            }
            //console.log("Before: " + paragraph.innerText);
            //console.log("After: " +  paragraph.innerText.replace(/[^\x00-\x7F]/g, " ")); //encodeURIComponent(paragraph.innerText));
            
        }
        
    }
};

var HttpClient = function() {
    this.get = function(aUrl, onSuccessCallback = null, onFailureCallback = null) {
        var anHttpRequest = new XMLHttpRequest();
        anHttpRequest.onreadystatechange = function() {
            if (anHttpRequest.readyState == 4) {
                if (anHttpRequest.status == 200 && onSuccessCallback != null) {
                    onSuccessCallback(anHttpRequest.responseText);
                } else {
                    if (onFailureCallback != null) {
                        onFailureCallback(anHttpRequest.responseText);
                    }
                }
            }
        }
        anHttpRequest.open("GET", aUrl, true);
        anHttpRequest.send(null);
    }
    this.post = function(url, params = null, onSuccessCallback = null, onFailureCallback = null) {
        var httpRequest = new XMLHttpRequest();
        httpRequest.onreadystatechange = function() {
            if (httpRequest.readyState == 4) {
                if (httpRequest.status == 200 && onSuccessCallback != null) { // 200 OK
                    onSuccessCallback(httpRequest.responseText);
                } else { // Not 200 OK
                    if (onFailureCallback != null) {
                        onFailureCallback(httpRequest.responseText)
                    }
                }
            }
        }
        httpRequest.open("POST", url, true);
        httpRequest.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        httpRequest.send(params);

    }
}

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
