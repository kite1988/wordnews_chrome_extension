// Shared functions and configurations for learning and annotation mode

//TODO: Variables such as isWorking, userAccount, wordDisplay, wordsReplace and translationUrl
//      are declared in learn.js BUT initalized at here
//      Need to remove these variables from learn.js and shift them to their respective settings.

var websiteSettingENUM = {cnn: 1, chinadaily: 2, bbc: 3};
var websiteSettingLookupTable = ['none', 'cnn.com', 'chinadaily.com.cn', 'bbc.co']; //none is just a buffer
var userSettings = {
    websiteSetting: [],
    userId: "",
    score: 0,
    rank: 0,
    learnLanguage: "",
    annotationLanguage: ""
};

var website;

var rankAccess = { 
                    FREE: 0,
                    VIEW_MACHINE_TRANSLATION: 1, 
                    TAKE_QUIZ : 2, 
                    VIEW_HUMAN_ANNOTATION: 3 ,
                    VOTE_TRANSLATIONS: 4,
                    INPUT_OWN_TRANSLATION: 5
                };

var eventLogger = {};

if (typeof chrome != 'undefined') {
    console.log('Chrome, initializating with chrome storage.');   
    
    //chrome.storage.sync.get(null, function(result) {
    //    for (var key in result) {
    //        userSettings[key] = result[key];
    //    }
    //});
    //Send message to background to notify new page
    chrome.runtime.sendMessage(
        { type: "new_page", currentURL: window.location.href   },
        function(response) {   
            //Respone will be a copy of user settings
            //Save a local copy of the user settings in content-share.js
            for (var key in response) {
                userSettings[key] = response[key];
            }
        }
    );
    //TODO: Why is handleInitResult is stored in sync?
    //chrome.storage.sync.get(null, handleInitResult);
} else {
    console.log('Not chrome, waiting for manual initialization.');
}

// Common function to 
function updateScoreAndRank(score, rank) {
    userSettings.score = score;
    userSettings.rank = rank;
    chrome.runtime.sendMessage(
        { type: "update_score_rank",
          score: score,
          rank: rank 
        },
        function(response) {   
            console.log("Score and rank updated");
            console.log('Score :' + score + " Rank: " + rank)
        }
    );    
}

const USER_RANK_INSUFFICIENT = -1;
const USER_NOT_LOGGED_IN = -2
const USER_HAS_ACCESS = 0;

function checkRankAndLogin(requiredRank) {
    var NOT_LOGIN = false;
    //TODO: How to even check is it login?
    if (requiredRank > userSettings.rank) {
        console.log('rank in setting ' + userSettings.rank)
        return USER_RANK_INSUFFICIENT;
    } else if (userSettings.rank >= 4 && NOT_LOGIN) { //IF not login return, -2 to prompt for login
        return USER_NOT_LOGGED_IN;        
    }
    return USER_HAS_ACCESS; //No problem with rank and login
}

function getURLPostfix(url) {
    var index = url.search('//');
    var noHTTPString = url.substr(index + 2); // this will get the string with http://
    index = noHTTPString.search('/');
    return noHTTPString.substr(index + 1);
}

function getParagraphs() {
	var paragraphs = []
    //If website is cnn
    if (document.URL.indexOf('cnn.com') !== -1) {
        paragraphs = $('.zn-body__paragraph').get();
        paragraphFormatTag = '.zn-body__paragraph';
        website = "cnn";
    }
    //if website is bbc
    else if (document.URL.indexOf('bbc.com') !== -1){
        // for most pages like http://www.bbc.com/sport/formula1/37506181
        article = document.getElementById('responsive-story-page');
        // for pages like http://www.bbc.com/future/story/20161003-would-it-be-ethical-to-implant-false-memories-in-therapy
        mainContent = document.getElementsByClassName('primary-content-lining');

        if (article!=null) {
            paragraphs = article.getElementsByTagName('p');
        } else if (mainContent.length>0) {
            paragraphs = mainContent[0].getElementsByTagName('p');
        } else {
             paragraphs = document.getElementsByTagName('p');
        }
        paragraphFormatTag = 'p';
        website = "bbc";
    }
    else { //TODO: Other webpages could be other tags instead of <p>
        paragraphs = document.getElementsByTagName('p');
        paragraphFormatTag = 'p';
        website = "other";
    }
    return paragraphs;
}

//Window event to check whether window is focused 
$(window).on("blur focus", function(e) {
    var prevType = $(this).data("prevType");

    if (prevType != e.type) {   //  reduce double fire issues
        switch (e.type) {
            case "blur":
                console.log("Blured"); 
                //Loop through the all the events and add no focus event
                for (var key in eventLogCont) {
                    newEvent(key, "no focus");
                }
                
                break;
            case "focus": //Update the chrome UI
                console.log("Focused")                

                chrome.runtime.sendMessage(                                
                    {type: "active", value: true},
                    function (response) { 
                        //Respone will be a copy of user settings
                        //Save a local copy of the user settings in content-share.js
                        for (var key in response) {
                            userSettings[key] = response[key];
                        }
                });      
                break;
        }
    }

    $(this).data("prevType", e.type);
})


chrome.storage.onChanged.addListener( function(changes, namespace){
    
    if (namespace == "sync") {
        for (key in changes) {
            var storageChange = changes[key];
            
            userSettings[key] = storageChange.newValue;
            
            //console.log('Storage key "%s" in namespace "%s" changed. ' +
            //        'Old value was "%s", new value is "%s".',
            //        key,
            //        namespace,
            //        storageChange.oldValue,
            //        storageChange.newValue);
        }
    }    
})

//This is temporary variable to use for checking the differences of mode and when to reload the page
var currentMode = "disable";

//Listener to handle event messages from background.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    //console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
    
    // If it is not app settings update
        
    //TODO: refine/improve on this condition/logic
    //If request mode is disable or current mode is disable and current mode is different from request mode
    if (request.mode == "disable" || ((currentMode != "disable") && (currentMode != request.mode)) ) {
        //Need to clear both annotation and learn 
        //TODO: Need ways to disable the functionality of annotation and learn without restarting
        window.location.reload();        
    } 
    
    if (request.mode == "annotate") {
        annotationLanguage = request.ann_lang;
        //wordDisplay = request.wordDisplay;
        //console.log("annotate mode lang:" + annotationLanguage);        
        beginAnnotation(request.user_id);
    }     
    else if (request.mode == "learn") {
        learnLanguage = request.learn_lang;
        translationType = request.translationType;
        quizType = request.quizType;
        wordDisplay = request.wordDisplay;
        if ( 'action' in request ) {
            // there is a user click in one of the social button
            if ( request.action == "send_fb_recommend" ) {
                fb_send_recommend();
            }
        }
        else {
            beginTranslating();
        }
    }    
    
    currentMode = request.mode;
    
    //TODO: This doesn't makes any sense unless the request only send ann_lang in the parameter
    if ('ann_lang' in request) {
        annotationLanguage = request.ann_lang;
    	console.log("update lang to " + annotationLanguage);
    }
});

//Common function to call ajax post for /log
function sendLog (data) {
    $.ajax({
        type: "post",
        beforeSend : function (request) {
            request.setRequestHeader("Accept", "application/json");
        },
        url: hostUrl + '/log',
        dataType: "json",
        data: data,
        success: function (result) {
            console.log("log successful.", result);                     
        },
        error: function (error) {
            console.log("log error.");            
        }        
    })
}


