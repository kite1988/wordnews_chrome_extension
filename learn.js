'use strict';


// TODO: FYP translation and bing translation are broken 


//var hostUrl = 'http://wordnews.herokuapp.com/';
//var hostUrl = "http://wordnews-mobile.herokuapp.com";
//var hostUrl = "http://wordnews-annotate.herokuapp.com/";
//var hostUrl = "http://localhost:3000/";

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
var contentToPopupForDisplayId = {};

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
            name: userID,
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
    
    //var params = 'name=' + appSetting.userId + '&wordID=' + tempWordID + '&isRemembered=' + isRemembered + '&url=' + encodeURIComponent(url);
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
            name: userID,
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
    
    //var loggingUrl = hostUrl + '/log';
    //
    //var params = 'name=' + appSetting.userId + '&time=' + encodeURIComponent(elapsed_time) + '&move=' + action;
    //var httpClient = new HttpClient();
    //
    //httpClient.post(loggingUrl, params, onSuccessCallback);
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
            user_id: appSetting.userId,
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

const CHINESE_TO_ENGLISH_QUIZ = 1;
const ENGLISH_TO_CHINESE_QUIZ = 2;
    
function addOptionsForQuiz(word, translatedWord, wordID, quiz) {
    
    var arrayShuffle = shuffle([1, 2, 3, 4]);
    var html = "";
    
    for (var i = 0; i < arrayShuffle.length; ++i) {
        //Append div tag
        if (i == 0 || i == 2) {
            html += '<div style="width: 100%;">';
        }
        
        var num = arrayShuffle[i];
        
        if (num != 4) {
            //w_num is used for appending in the div tag, if num is 1, append nothing else append num
            var w_num = num == 1 ? "" : num;
            html += '<div id="' + wordID + '_w' + w_num + '" align="center" class="choice_class" onMouseOver="this.style.color=\'#FF9900\'" onMouseOut="this.style.color=\'#626262\'" style="font-weight: bold; cursor:pointer; color: #626262; width: 50%; float: left; padding-top: 16px;">' + quiz.choices[toString(num)] + '</div>';
        } else {
            var appendWord = (quiz.testType == CHINESE_TO_ENGLISH_QUIZ) ? word : translatedWord;
            html += '<div id="' + wordID + '_c" align="center"' +
                    'class="choice_class" onMouseOver="this.style.color=\'#FF9900\'"' +
                    'onMouseOut="this.style.color=\'#626262\'" style="font-weight: bold;' +
                    'cursor:pointer; color: #626262; float: left; width: 50%; padding-top:' +
                    '16px;">' + appendWord + '</div>';
        }
        //Append the end of div tag
        if (k == 1 || k == 3) {
            html += "</div>";
        }
    }
    return html;
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
        var id =  wordElem.text + '_' + wordElem.word_id + '_' + wordElem.paragraph_index + '_' + learnType;
        var pronunciation = wordElem.pronunciation.replace('5', '');
        
        var joinString = '';
        joinString += '<span ';
        joinString += 'class = "translate_class" ';
        joinString += 'style="text-decoration:underline; font-weight: bold; "';
        joinString += 'data-placement="above" ';
        
        //If it is view mode
        if (learnType == 0) {
            
            //TODO: More like scalable by using generic variable names
            var splitPinyin = pronunciation.split(' ');
            var chineseCharacters = wordElem.translation.replace('(', '').replace(')', '').split('');                       
            
            var append = '<div id=\"' + id + '_popup\" class="jfk-bubble gtx-bubble" style="visibility: visible;  opacity: 1;">';
            append += '<div class="jfk-bubble-content-id"><div id="gtx-host" style="min-width: 200px; max-width: 400px;">';
            append += '<div id="bubble-content" style="min-width: 200px; max-width: 400px;" class="gtx-content">';
            append += '<div class="content" style="border: 0px; margin: 0">';
            append += '<div id="translation" style="min-width: 200px; max-width: 400px; display: inline;">';
            append += '<div class="gtx-language">ENGLISH</div>';
            append += '<div class="gtx-body" style="padding-left:21px;">' + wordElem.text + '</div><br>';
            append += '<div class="gtx-language">CHINESE (SIMPLIFIED)</div>';

            append += '<p style = "margin: 0px;padding-left:10px;">';
            for (var k = 0; k < chineseCharacters.length; k++) {
                append += '<img style="height:21px;width:21px;display:inline-block;opacity:0.55;vertical-align:middle;background-size:91%;-webkit-user-select: none;-webkit-font-smoothing: antialiased;" class="audioButton"  id="' + splitPinyin[k] + '" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAQAAABKfvVzAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAACjSURBVDjLY2AYYmA1QwADI3FKy8HkfyA8zqBOjPL/YLqO4SWQ9YXBmbDy/1C2EMMGsBZNQsr/w/lMDCuAvKOElP+HeloQSPIxPAPynVAV/seAENHtYLoKyJpDnIb/DOZA2gBI3yRWQx6Q5gZ7nFYaQE4yJN5JW8B0PaanYaADRcMaBh5wsD7HDFZMLURGHEIL0UkDpoWExAfRQlLyJiMDDSAAALgghxq3YsGLAAAAAElFTkSuQmCC" >'
                append += chineseCharacters[k] + ' ';
            }
            for (var k = 0; k < splitPinyin.length; k++) {
                append += '<audio id="myAudio_' + splitPinyin[k] + '" style = "display: none;">'
                append += '<source src="http://www.chinese-tools.com/jdd/public/ct/pinyinaudio/' + splitPinyin[k] + '.mp3" type="audio/mp3">';
                append += '</audio>';
            }
            append += '<div class="row" style="margin-left:10px">';
            for (var k = 0; k < splitPinyin.length; k++) {

                append += '<div style="height:21px;width:15px;display:inline-block;"> </div>';
                append += '<small>' + splitPinyin[k] + '</small> ';
            }
            append += '</div>';
            
            var see_more_id = "more_" + id;
            append += '</p>';
            append += '<a id="' + see_more_id + '" target="_blank" class="More" href="http://dict.cn/en/search?q=' + wordElem.text + '" style="color: #A2A2A2; float: right; padding-top: 16px;">MORE »</a>';
            append += '</div></div></div></div></div>';
            append += '<div class="jfk-bubble-arrow-id jfk-bubble-arrow jfk-bubble-arrowup" style="left: 117px;">';
            append += '<div class="jfk-bubble-arrowimplbefore"></div>';
            append += '<div class="jfk-bubble-arrowimplafter"></div></div></div>';

            contentToPopupForDisplayId[id + "_popup"] = append;
        } else {
            //TODO: Need to make this more generic
            if (wordElem.testType === CHINESE_TO_ENGLISH_QUIZ) {
                joinString += 'title="Which of the following is the corresponding English word?" ';
            } else if (wordElem.testType === ENGLISH_TO_CHINESE_QUIZ) {
                joinString += 'title="Which of the following is the corresponding Chinese word?" ';
            }
            joinString += 'href="#" ';          
           
            var append = '<div id=\"' + id + '_popup\" class="jfk-bubble gtx-bubble" style="visibility: visible;  opacity: 1; padding-bottom: 40px; ">' + '<div class="jfk-bubble-content-id"><div id="gtx-host" style="min-width: 200px; max-width: 400px;">' + '<div id="bubble-content" style="min-width: 200px; max-width: 400px;" class="gtx-content">' + '<div id="translation" style="min-width: 200px; max-width: 400px; display: inline;">' + '<div style="font-size: 80%;" class="gtx-language">Choose the most appropriate translation:</div>';

            append += addOptionsForQuiz();
            append += '</div></div></div></div>' + '<div class="jfk-bubble-arrow-id jfk-bubble-arrow jfk-bubble-arrowup" style="left: 117px;">' + '<div class="jfk-bubble-arrowimplbefore"></div>' + '<div class="jfk-bubble-arrowimplafter"></div></div></div>';
            contentToPopupForDisplayId[id + "_popup"] = append;                        
        }
        joinString += 'id = "' + id + '" >';
            
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
            //if (n%2 === 1) {  // TODO figure out the goal of this code...
            //result += parts[0] + '"' + joinString + '"';
            //} else {
            result += parts[0] + joinString;
            //}
            parts.splice(0, 1);
        }

        result += parts.join(' ' + wordElem.text + ' ');

        paragraph.innerHTML = result;
        
    }

    //This code below is bought over from the previous code
    $(document).off('mousedown.wordnews').on('mousedown.wordnews', function(e) {
        e = e || window.event;
        var id = (e.target || e.srcElement).id;
        var thisClass = (e.target || e.srcElement).className;
        //Get all the tag that has jfk-bubble
        var container = $(".jfk-bubble");
        
        var currentTime = new Date();
        var timeElapsed = currentTime - startTime;
    
        //Why check for first container only?
        if (container[0]) {
            // if the target of the click is neither the container 
            // nor a descendant of the container
            if (!container.is(e.target) && container.has(e.target).length === 0) { 
                var id = container.attr('id');
                console.log("container id: " + id);
                var englishWord = id.split('_')[1];
                var tempWordID = id.split('_')[2];
                var viewOrTest = id.split('_')[4];
                
                if (viewOrTest == '0') {
                    // increase the number of words encountered
                    sendRememberWords(appSetting.userId, tempWordID, 1, document.URL)
                    // Fire logging
                    sendUserAction(appSetting.userId, timeElapsed, 'see_' + tempWordID);
                    // add to page's learned words
                    pageWordsLearned.add(tempWordID);                        
                    console.log("wid: " + tempWordID);
                }
                
                if (thisClass === 'More') {    
                    sendRememberWords(appSetting.userId, tempWordID, 0, document.URL)        
                    sendUserAction(appSetting.userId, timeElapsed, 'more_wordID_' + tempWordID);    
                }
                
                if (thisClass === 'audioButton') {
                    ////console.log("clicked id is "+id);
                    var myAudio = document.getElementById("myAudio_" + id);
                    sendUserAction(appSetting.userId, timeElapsed, 'clickAudioButton_wordID_' + id);

                    if (myAudio.paused) {
                        myAudio.play();
                    } else {
                        myAudio.pause();
                    }
                }
                
                if (thisClass === 'choice_class') {
                   
                    var isCorrect = englishWord;
                    if (isCorrect === 'c') {
                        // Answered correctly. So we increase the remembered count
                        sendRememberWords(appSetting.userId, tempWordID, 1, document.URL);

                        sendUserAction(appSetting.userId, timeElapsed, 'correct_quiz_answer_wordId_' + tempWordID);

                        $('.jfk-bubble').css("background-image", "url('https://lh4.googleusercontent.com/-RrJfb16vV84/VSvvkrrgAjI/AAAAAAAACCw/K3FWeamIb8U/w725-h525-no/fyp-correct.jpg')");

                        $('.jfk-bubble').css("background-size", "cover");

                        $('.content').css("background-color", "#cafffb");
                    } else {

                        // Answered incorrectly.
                        sendRememberWords(appSetting.userId, tempWordID, 0, document.URL)

                        sendUserAction(appSetting.userId, timeElapsed, 'wrong_quiz_answer_wordID_' + tempWordID);

                        $('.jfk-bubble').css("background-image", "url('https://lh6.googleusercontent.com/--PJRQ0mlPes/VSv52jGjlUI/AAAAAAAACDU/dU3ehfK8Dq8/w725-h525-no/fyp-wrong.jpg')");
                        $('.jfk-bubble').css("background-size", "cover");
                    }
                }                
            }
        }
    });
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

        sendRememberWords(appSetting.userId, tempWordID, 1, document.URL)

        document.getElementById('alertSuccess').style.display = 'inline-flex';
        setTimeout(function() { $('.translate_class').popover('hide') }, 1000);
    } else {

        sendRememberWords(appSetting.userId, tempWordID, 0, document.URL)

        document.getElementById('alertDanger').style.display = 'inline-flex';
        setTimeout(function() { $('.translate_class').popover('hide') }, 2500);
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

    $('body').append(contentToPopupForDisplayId[id + '_popup']);
    document.getElementById(id + '_popup').style.left = (rect.left - 100) + 'px';
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
    for (var k = 0; k < appSetting.websiteSetting.length; k++) {
        var website = websiteSettingLookupTable[appSetting.websiteSetting[k]];
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
            if (text.split(' ').length > 1 )
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
