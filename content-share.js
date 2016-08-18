// Shared functions and configurations for learning and annotation mode

//TODO: Variables such as isWorking, userAccount, wordDisplay, wordsReplace and translationUrl
//      are declared in learn.js BUT initalized at here!!!
//      Need to remove these variables from learn.js and shift them to their respective settings.


// TODO: move common variables to here
var hostUrl = "https://wordnews-server-kite19881.c9users.io";
//TODO: Need to find ways to put websiteSetting to user level settings.
//      For now it is hardcoded        
var websiteSetting = "cnn.com_bbc.co";

//TODO: Better to bring this over to background.js since there is a similar function as this.
//      Also, why is handleInitResult is stored in sync???
if (typeof chrome != 'undefined') {
    console.log('Chrome, initializating with chrome storage.');
    //TODO: Revamp initalize function
    //chrome.storage.sync.get(null, handleInitResult);
} else {
    console.log('Not chrome, waiting for manual initialization.');
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
    isWorking = result.isWorking;// || undefined;
    
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
    if ( typeof result.userAccount != 'undefined' ) {
        userAccount = result.userAccount
    }
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

    //console.log("user acc: "+ result.userAccount);
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
    if (learnLanguage == null) {
    	learnLanguage = 'zh_CN';
        saveSetting ({'learnLanguage': 'zh_CN'});
    }    

    if (userAccount == undefined) {
        // Register an account
        var registerUser = new HttpClient();
        registerUser.get(hostUrl + '/getNumber',
            function(onSuccessAnswer) {
                var obj = JSON.parse(onSuccessAnswer);
                if ('userID' in obj) {
                    userAccount = obj['userID'];
                    saveSetting({ 'userAccount': userAccount });
                    beginTranslating();
                }
            },
            function(onFailureAnswer) {
                var obj = JSON.parse(onFailureAnswer);
                console.log("Server error: " + obj['msg']);
            }
        );
    } else {
        beginTranslating();
    }
}

//TODO: 1) keep consistent with the synUser() in popup.js and 
// 2) wrap some code as a utility function for annotate.js 
function initAnnotate(result) {
	annotationLanguage = result.annotationLanguage;
    if (annotationLanguage == null) {
    	annotationLanguage = 'zh_CN';
    	saveSetting({'annotationLanguage': 'zh_CN'});
    }
    
    userAccount = result.userAccount;
    userId = result.userId;
    // console.log('user acc: '+ result.userAccount);

    if (userAccount == undefined || typeof userAccount == "string") {

        //This temporary method of generating will not create a true unique ID
        var i = new Date().getTime();;
        i = i & 0xffffffff;
        userAccount = (i + Math.floor(Math.random() * i)); //'id' + d.getTime() + '_1';

        chrome.storage.sync.set({
            'userAccount': userAccount
        }, function() {});
    }
    
    //if (userId == undefined) {
    //	$.ajax({
    //        type : "get",
    //        beforeSend : function(request) {
    //            request.setRequestHeader("Accept", "application/json");
    //        },
    //        url : hostUrl + "/get_user_id_by_user_name",
    //        dataType : "json",
    //        data : {         
    //        	user_name: userAccount
    //        },
    //        success : function(result) { // get successful and result returned by server
    //        	if ('user_id' in obj) {
    //                userId = obj['user_id'];
    //                chrome.storage.sync.set({
    //                    'userId': userId
    //                }, function() {
    //                	beginAnnotation(userId);
    //                });
    //            }
    //        },
    //        error : function(result) {
    //            console.log( "get user id failed" );
    //        }
    //    });  
    //} else {
    //	beginAnnotation(userId);
    //}
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

//This is temporary variable to use for checking the differences of mode and when to reload the page
var currentMode = "disable";

//Listener to handle event messages from background.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    //console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
    
    //If request mode is disable or current mode is disable and current mode is different from request mode
    if (request.mode == "disable" || ((currentMode != "disable") && (currentMode != request.mode)) ) {
	    //Need to clear both annotation and learn 
	    //TODO: Need ways to disable the functionality of annotation and learn without restarting
        window.location.reload();        
	} 
    
	if (request.mode == "annotate") {
        annotationLanguage = request.ann_lang;
	    //console.log("annotate mode lang:" + annotationLanguage);        
	    beginAnnotation(request.user_id);
	}     
    else if (request.mode == "learn") {
        learnLanguage = request.learn_lang;
        beginTranslating();
    }
    
    currentMode = request.mode;
    
    //TODO: This doesn't makes any sense unless the request only send ann_lang in the parameter
    if ('ann_lang' in request) {
        annotationLanguage = request.ann_lang;
    	console.log("update lang to " + annotationLanguage);
    }
});


