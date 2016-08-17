// Shared functions and configurations for learning and annotation mode

//TODO: These variables are also in popup.js
var modeLookUpTable = ["disable", "learn", "annotate"];

var modes = {
    disable: 0,
    learn: 1,
    annotate: 2
};

var currentMode = modes.disable;

// TODO: move common variables to here
var hostUrl = "https://wordnews-server-kite19881.c9users.io";


if (typeof chrome != 'undefined') {
    console.log('Chrome, initializating with chrome storage.');
    chrome.storage.sync.get(null, handleInitResult);
} else {
    console.log('Not chrome, waiting for manual initialization.');
}

// This function is called from Android client, with appropriate params
function initFromAndroid(androidID, andoridScreenWidth) {
    console.log('initFromAndroid: ' + androidID + ' ' + andoridScreenWidth);
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
    if ( typeof result.wordsReplaced != 'undefined' ) {
        wordsReplaced = result.wordsReplaced
    }
    if ( typeof result.websiteSetting != 'undefined' ) {
        websiteSetting = result.websiteSetting
    }

    console.log(result.translationUrl);
    if (typeof result.translationUrl != 'undefined') {
        translationUrl = result.translationUrl;
    }

    //console.log("user acc: "+ result.userAccount);
    //console.log("user isWorking: "+ result.isWorking);
    console.log("user wordDisplay: "+ result.wordDisplay);
    //console.log("user wordsReplaced: "+ result.wordsReplaced);
    //console.log("user websiteSetting: "+ result.websiteSetting);

    
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
                //chrome.runtime.sendMessage(
                //    //Send message to background.js that this tab is active
                //    {type: "active", value: false},
                //    function (response) {
                //        console.log(response);
                //    }
                //);     
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



