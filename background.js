//Have a local copy of the tabs information container
var tabsInfoCont = {};
var logoImgDir = [  "images/logo-gray.png", //disable
                    "images/logo.png", //learn
                    "images/logo.png" //annotation
                 ];
                 
var modeENUM = { disable: 0, learn : 1, annotation: 2 };

var userSettings = UserSettings.getInstance();

//Have a local copy of current window store in Google storage local
var currentWindowInfo;

/**
 * Obtains a OAuth2 token_id from google. Validate the token_id with the backend and obtain the email to be
 * used as the idenfifier of the user.
 */
 
chrome.storage.sync.get(null, function(result) {
  var url = makeUrlForGoogleOAuth();

  //if (!result.hasOwnProperty('userAccount')) {
     // launchGoogleLoginFlow(url);
  //}
  
  // isWorking does not exists anymore
  //var isWorking = result.isWorking;
  //if (isWorking == 0) {
  //    
  //    var imgURL = chrome.extension.getURL("images/logo-gray.png");
  //    chrome.browserAction.setIcon({ path: imgURL });
  //} 
});

function updateLogo (mode) {
    //Set the extension icon
    var imgDir = logoImgDir[mode];
    var imgURL = chrome.extension.getURL(imgDir);
    chrome.browserAction.setIcon({ path: imgURL });
}

function setMode (mode, tabID) {
    updateLogo(mode);
    //TODO: the condition for learn is temporary
    if (mode == modeENUM.disable) {
        //chrome.tabs.sendMessage(tabID, { mode: "unannotate" }, function(response) {});
        //TODO: Check whether does learn mode has listener to disable learn mode
        //Send message to learn for deactivation
    }
    else if (mode == modeENUM.annotation) {
        chrome.storage.sync.get(null, function (result) {
            console.log(result);
            chrome.tabs.sendMessage(
                tabID, 
                { mode: "annotate",  user_id : result.userId, ann_lang: tabsInfoCont[tabID].ann_lang}, 
                function(response) {} );
        });        
    }
    else if (modeENUM.learn == mode) {
        chrome.tabs.sendMessage(
            tabID, 
            { mode: "learn", learn_lang: tabsInfoCont[tabID].learn_lang}, 
            function(response) {
                
            } 
        );
    }
}
//Listener
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log("background.js got a message")
        console.log("request: ", request);
        //console.log(sender);
        //console.log("sender tab id: " + sender.tab.id);
        
        //Some messages recieved from popup do not have sender variable
        //Therefore, we will take request tab_id as tab ID
        var tabID;
        if (sender.tab != undefined) {
            tabID = sender.tab.id;
        } else {
            tabID = request.tab_id;
        }
        
        //If recieved an "active" message type
        if (request.type == "active") { 
            var mode = 0;
            //value will determine whether to activate or deactive the word news
            if (request.value) {
                //Get the mode id from the tab info container                
                var tmp = tabsInfoCont[tabID];
                //If this tab id is not registered in the database, ignore it
                if (tmp == undefined) {
                    return;
                }                
                mode = tmp.mode;
            }            
            updateLogo(mode);      
            //Many more things need to be done...

        } else if (request.type == "new_tab") {
            console.log("Request type is new tab");
            
            //Set learn mode "1" and lanuage to chinese for both annotation and learn as default for new tab
            tabsInfoCont[tabID] = { mode: 1, 
                                    ann_lang: 'zh_CN', 
                                    learn_lang: 'zh_CN',
                                    wordsDisplay: 0,
                                    wordsLearn: 0
                                  };
            //Sync tab information container in google local storage
            chrome.storage.local.set({
                        'tabsInfoCont': tabsInfoCont,
                        'hasTabs': true
                    }, function() {
                        console.log("tabsInfoCont is sync-ed.");
                        //Send a response back to popup.js to update the UI                        
                        sendResponse(tabsInfoCont[tabID]);
            });
            //From Google API...
            //This function becomes invalid when the event listener returns, 
            //unless you return true from the event listener to 
            //indicate you wish to send a response asynchronously 
            //(this will keep the message channel open to the other end 
            //until sendResponse is called).
            return true;
        } else if (request.type == "mode") {
            setMode(request.mode, tabID);
            //Update the local chrome storage with the local copy
            tabsInfoCont[tabID].mode = request.mode;
            chrome.storage.local.set({
                    'tabsInfoCont': tabsInfoCont
                }, function() {
                    console.log("tabsInfoCont is sync-ed.");
            });
            
        } else if (request.type == "update_tab") {
            //Iterate all the settings and update the local copy
            for (var key in request.settings) {
                tabsInfoCont[tabID][key] = request.settings[key];
            }
            //Update the local chrome storage with the local copy
            chrome.storage.local.set({
                        'tabsInfoCont': tabsInfoCont,
                    }, function() {
                        console.log("tabsInfoCont is sync-ed.");                        
                }
            );
            //If the request has send for request to update the mode.
            if (request.update_mode) {
                setMode(tabsInfoCont[tabID].mode, tabID);
            }
        } else if (request.type == "new_page") {
            if (tabID in tabsInfoCont) {
                setMode(tabsInfoCont[tabID].mode, tabID);
            }
        }
    }
);

chrome.cookies.onChanged.addListener(
    function (changeInfo) {
        var link = document.createElement("a");
        link.href = hostUrl;
        if ( changeInfo['cookie']['domain'] == link.hostname ) {
            if ( changeInfo['cookie']['name'] == "user_id" && changeInfo['removed'] == false ) {
                console.log(JSON.stringify(changeInfo));
                chrome.cookies.get( { "url": hostUrl, "name" : "user_id" },
                    function (cookies) {
                        if ( cookies != null ) {
                            userSettings.setUserId(parseInt(cookies['value']));
                        }
                    }
                );
            }
        }

    }
);


//Since there is no proper on close event for chrome yet
//We will clear the local storage of chrome when background.js is loaded
//and set the tabs information container
$(document).ready(function() {
    chrome.storage.local.clear();
    chrome.storage.local.set({
                'tabsInfoCont': tabsInfoCont,
                'hasTabs': false
            }, function() {
                console.log("tabsInfoCont is sync-ed.");
    });
});