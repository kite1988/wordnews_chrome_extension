var UserSettings = (function ( onCompleteCallback = null ) {
    // Instance stores a reference to the Singleton
    var instance;

    function init(onCompleteCallback) {
        // Singleton
        // Private methods and variables

        function saveSetting(obj) {
            if (typeof chrome != 'undefined') {
                console.log('saving setting for ', JSON.stringify(obj, null, '\t'));
                chrome.storage.sync.set(obj);
            } else {
                console.log('saving setting for other clients not implemented.');
            }
        }

        // var isWorking;
        // var wordDisplay;
        // var wordsReplaced;
        // var learnLanguage;
        // var translationType;
        // var annotationLanguage;

        var websiteSetting;
        var userId;
        var rank;
        var score;
        var currentState = "ON_INSTANCE_INIT";
        var onInitCompleteCallback = onCompleteCallback        
                
        chrome.storage.sync.get(null, handleInitResult);

        console.log("UserSettingsInit")

        function handleInitResult( result ) {
            console.log("HandleInitResult")

            currentState = "ON_HANDLE_INIT";

            if ( typeof result.websiteSetting != 'undefined' ) {
                websiteSetting = result.websiteSetting;
            }
            else {
                websiteSetting = [1,3]
                //console.log("websiteSetting undefined");
                saveSetting({ 'websiteSetting': websiteSetting });
            }
            // if ( typeof result.isWorking != 'undefined' ) {
            //     isWorking = result.isWorking;
            // }
            // else {
            //     isWorking = 1;
            //     //console.log("isWorking undefined");
            //     saveSetting({ 'isWorking': isWorking });
            // }
            //
            // if ( typeof result.wordDisplay != 'undefined' ) {
            //     wordDisplay = result.wordDisplay;
            // }
            // else {
            //     wordDisplay = 1;
            //     //console.log("wordDisplay undefined");
            //     saveSetting({ 'wordDisplay': wordDisplay });
            // }
            //
            // if ( typeof result.wordsReplaced != 'undefined' ) {
            //     wordsReplaced = result.wordsReplaced;
            // }
            // else {
            //     wordsReplaced = 6;
            //     //console.log("wordsReplaced undefined");
            //     saveSetting({ 'wordsReplaced': wordsReplaced });
            // }
            // if ( typeof result.learnLanguage != 'undefined' ) {
            //     learnLanguage = result.learnLanguage;
            // }
            // else {
            //     learnLanguage = 'zh_CN';
            //     //console.log("learnLanguage undefined");
            //     saveSetting ({'learnLanguage': 'zh_CN'});
            // }
            //
            // if ( typeof result.translationType != 'undefined' ) {
            //     translationType = result.translationType;
            // }
            // else {
            //     translationType = 1;
            //     //console.log("translationType undefined");
            //     saveSetting ({'translationType': 1});
            // }
            //
            // if ( typeof result.annotationLanguage != 'undefined' ) {
            //     annotationLanguage = result.annotationLanguage;
            // }
            // else {
            //     annotationLanguage = 'zh_CN';
            //     //console.log("annotationLanguage undefined");
            //     saveSetting({'annotationLanguage': 'zh_CN'});
            // }

            if ( typeof result.userId == 'undefined' ) {
                currentState = "ON_CREATE_USER";
                //console.log("userId undefined");
                $.ajax({
                    type : "get",
                    beforeSend : function(request) {
                        request.setRequestHeader("Accept", "application/json");
                    },
                    url : hostUrl + "/create_new_user",
                    dataType : "json",
                    success : function(result) { // get successful and result returned by server
                        if ('user_id' in result) {
                            userId = result['user_id'];
                            score = result['score'];
                            rank = result['rank'];
                            
                            saveSetting({ 'userId': userId });
                            saveSetting({ 'score': score });
                            saveSetting({ 'rank': rank });
                        }
                        currentState = "ON_INIT_COMPLETE";
                        if ( onInitCompleteCallback != null ) {
                            onInitCompleteCallback()
                        }
                    },
                    error : function(result) {
                        console.log( "get user id failed" );
                        currentState = "ON_CREATE_USER_FAIL";
                    }
                });
            }
            else {
                userId = result.userId;
                currentState = "ON_INIT_COMPLETE";
                if ( onInitCompleteCallback != null ) {
                    onInitCompleteCallback()
                }
            }
        }

        return {
            // Public methods and variables. Setters and Getters
            // getWordDisplay: function () {
            //     return wordDisplay;
            // },
            // setWordDisplay: function( newWordDisplay ) {
            //     if (newWordDisplay != wordDisplay) {
            //         saveSetting( { 'wordDisplay' : newWordDisplay } );
            //     }
            //     wordDisplay = newWordDisplay;
            // },
            // getWordsReplaced: function () {
            //     return wordsReplaced;
            // },
            // setWordsReplaced: function( newWordsReplaced ) {
            //     if (newWordsReplaced != wordsReplaced) {
            //         saveSetting( { 'wordsReplaced' : newWordsReplaced } );
            //     }
            //     wordsReplaced = newWordsReplaced;
            // },
            // getIsWorking: function () {
            //     return isWorking;
            // },
            // setIsWorking: function( newIsWorking ) {
            //     if (newIsWorking != websiteSetting) {
            //         saveSetting( { 'isWorking' : newIsWorking } );
            //     }
            //     isWorking = newIsWorking;
            // },
            // getLearnLanguage: function () {
            //     return learnLanguage;
            // },
            // setLearnLanguage: function( newLearnLanguage ) {
            //     if (newLearnLanguage != learnLanguage ) {
            //         saveSetting( { 'learnLanguage' : newLearnLanguage } );
            //     }
            //     learnLanguage = newLearnLanguage;
            // },
            // getTranslationType: function () {
            //     return translationType;
            // },
            // setTranslationType: function( newTranslationType ) {
            //     if (newTranslationType != translationType ) {
            //         saveSetting( { 'translationType' : newTranslationType } );
            //     }
            //     translationType = newTranslationType;
            // },
            // getAnnotationLanguage: function () {
            //     return annotationLanguage;
            // },
            // setAnnotationLanguage: function( newAnnotationLanguage ) {
            //     if (newAnnotationLanguage != annotationLanguage ) {
            //         saveSetting( { 'annotationLanguage' : newAnnotationLanguage } );
            //     }
            //     annotationLanguage = newAnnotationLanguage;
            // },
            getWebsiteSetting: function () {
                return websiteSetting;
            },
            setWebsiteSetting: function( newWebsiteSetting ) {
                if (newWebsiteSetting != websiteSetting) {
                    saveSetting( { 'websiteSetting' : newWebsiteSetting } );
                }
                websiteSetting = newWebsiteSetting;
            },
            getUserId: function () {
                return userId;
            },
            setUserId: function( newUserId ) {
                if (newUserId != userId) {
                    saveSetting( { 'userId' : newUserId } );
                }
                userId = newUserId;
            },
            getState: function() {
                return currentState;
            },
            getSettings: function () {
                return {
                    // "isWorking" : isWorking,
                    // "wordDisplay" : wordDisplay,
                    // "wordsReplaced" : wordsReplaced,
                    // "learnLanguage" : learnLanguage,
                    // "annotationLanguage" : annotationLanguage,
                    //"translationType" :translationType,
                    "websiteSetting" : websiteSetting,
                    "userId" : userId
                };
            }

        };
    };
    return {
        // Get the Singleton instance if one exists
        // or create one if it doesn't
        getInstance: function (onCompleteCallback = null ) {
            if ( !instance ) {
                instance = init(onCompleteCallback);
            }
            return instance;
        }
    };
})();
