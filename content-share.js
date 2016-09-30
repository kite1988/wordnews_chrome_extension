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



if (typeof chrome != 'undefined') {
    console.log('Chrome, initializating with chrome storage.');   
    
    //chrome.storage.sync.get(null, function(result) {
    //    for (var key in result) {
    //        userSettings[key] = result[key];
    //    }
    //});
    //Send message to background to notify new page
    chrome.runtime.sendMessage(
        { type: "new_page" },
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

// This function is called from Android client, with appropriate params
function initFromAndroid(androidID, andoridScreenWidth) {
    console.log('initFromAndroid: ' + androidID + ' ' + andoridScreenWidth);
    //TODO: The function parameter does not match with function defination
    //      unless it is calling handleInitResult at some other files.
    handleInitResult({
        userAccount: androidID
    });
}

function saveSetting(obj) {
    if (typeof chrome != 'undefined') {
        // console.log('saving setting for ', JSON.stringify(obj, null, '\t'));
        chrome.storage.sync.set(obj);
    } else {
        console.log('saving setting for other clients not implemented.');
    }
}
//Need to change this for website
function handleInitResult(result, androidID) {

    var allKeys = Object.keys(result);
    isWorking = result.isWorking;//undefined;
    
    console.log("isWorking in init " + isWorking);
    
    if (isWorking == undefined) {
        isWorking = 1;
        saveSetting({ 'isWorking': isWorking });
    }
    
    if (isWorking == 1) { // learning
    	initLearn(result);
    } else if (isWorking == 2) { // annotation
    	initAnnotate(result);
    } else { // disable
    }
}

// TODO: keep consistent with the synUser() in popup.js
function initLearn(result) {
    if ( typeof result.wordDisplay != 'undefined' ) {
        wordDisplay = result.wordDisplay
    }
    //TODO: wordsReplace is not being used by anywhere. Check again before removing this
    if ( typeof result.wordsReplaced != 'undefined' ) {
        wordsReplaced = result.wordsReplaced
    }
    if ( typeof result.websiteSetting != 'undefined' ) {
        websiteSetting = result.websiteSetting
    }
    //TODO: translationUrl is being initialized twice! Once here and another time at learn.js
    console.log(result.translationUrl);
    if (typeof result.translationUrl != 'undefined') {
        translationUrl = result.translationUrl;
    }

    //console.log("user isWorking: "+ result.isWorking);
    console.log("user wordDisplay: "+ result.wordDisplay);
    //console.log("user wordsReplaced: "+ result.wordsReplaced);
    //console.log("user websiteSetting: "+ result.websiteSetting);

    //TODO: Find where is TranslationDirection defined at
	if (wordDisplay == undefined) {
        wordDisplay = TranslationDirection.ENGLISH;
        saveSetting({ 'wordDisplay': wordDisplay });
    }

    if (wordsReplaced == undefined) {
        wordsReplaced = 6;
        //console.log("Setting words to replace to : " + wordsReplaced + " (default setting)");
        saveSetting({ 'wordsReplaced': wordsReplaced });
    }

    if (websiteSetting == undefined) {
        websiteSetting = "cnn.com_bbc.co";
        //console.log("Setting websites to use to : " + websiteSetting + " (default setting)");
        saveSetting({ 'websiteSetting': websiteSetting });
    }

    startTime = new Date(); // this is used to track the time between each click

    userSettings.updateNumWords(wordsReplaced);
    
    learnLanguage = result.learnLanguage;
    if (learnLanguage == undefined) {
    	learnLanguage = 'zh_CN';
        saveSetting ({'learnLanguage': 'zh_CN'});
    }    


    beginTranslating();
}

//TODO: 1) keep consistent with the synUser() in popup.js and 
// 2) wrap some code as a utility function for annotate.js 
function initAnnotate(result) {
	annotationLanguage = result.annotationLanguage;
    if (annotationLanguage == undefined) {
    	annotationLanguage = 'zh_CN';
    	saveSetting({'annotationLanguage': 'zh_CN'});
    }    
    userId = result.userId;
}

//Window event to check whether window is focused 
$(window).on("blur focus", function(e) {
    var prevType = $(this).data("prevType");

    if (prevType != e.type) {   //  reduce double fire issues
        switch (e.type) {
            case "blur":
                console.log("Blured"); 
                break;
            case "focus": //Update the chrome UI
                console.log("Focused")                

                chrome.runtime.sendMessage(                                
                    {type: "active", value: true},
                    function (response) {                       
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
        beginTranslating();
    }    
    
    currentMode = request.mode;
    
    //TODO: This doesn't makes any sense unless the request only send ann_lang in the parameter
    if ('ann_lang' in request) {
        annotationLanguage = request.ann_lang;
    	console.log("update lang to " + annotationLanguage);
    }
});


