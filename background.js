//Have a local copy of the tabs information container
var tabsInfoCont = {};
var logoImgDir = [  "images/logo-gray.png", //disable
                    "images/logo.png", //learn
                    "images/logo.png" //annotation
                 ];
                 
var modeENUM = { disable: 0, learn : 1, annotation :2 };

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
  
  var isWorking = result.isWorking;
  if (isWorking == 0) {
      
      var imgURL = chrome.extension.getURL("images/logo-gray.png");
      chrome.browserAction.setIcon({ path: imgURL });
  } 
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
    if (mode == modeENUM.disable || modeENUM.learn == mode) {
        chrome.tabs.sendMessage(tabID, { mode: "unannotate" }, function(response) {});
        //TODO: Check whether does learn mode has listener to disable learn mode
        //Send message to learn for deactivation
    }
    else if (mode == modeENUM.annotation) {
        chrome.storage.sync.get(null, function (result) {
            console.log(result);
            chrome.tabs.sendMessage(
                tabID, 
                { mode: "annotate",  user_id : result.userId, ann_lang:   tabsInfoCont[tabID].lang}, 
                function(response) {} );
        });
        
    }
    tabsInfoCont[tabID].mode = mode;
    chrome.storage.local.set({
            'tabsInfoCont': tabsInfoCont
        }, function() {
            console.log("tabsInfoCont is sync-ed.");
    });
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
            
            //Update the current window info in google storage local
            chrome.storage.local.set({
               'currentWindowInfo':  tabsInfoCont[tabID]
                }, function() {
                    console.log("currentWindowInfo is updated.");
            });            
            
            //Still got many more things need to do......

        } else if (request.type == "new_tab") {
            console.log("Request type is new tab");
            
            //Set learn mode "1" and lanuage to chinese as default for new tab
            tabsInfoCont[tabID] = {mode: 1, lang: 'zh_CN'};
            //Sync tab information container in google local storage
            chrome.storage.local.set({
                        'tabsInfoCont': tabsInfoCont,
                        'hasTabs': true
                    }, function() {
                        console.log("tabsInfoCont is sync-ed.");
            });
        } else if (request.type == "mode") {
            setMode(request.mode, tabID);
        }       
        //sendResponse("bar");
    }
);

$(document).ready(function() {
    chrome.storage.local.clear();
    chrome.storage.local.set({
                'tabsInfoCont': tabsInfoCont,
                'hasTabs': false
            }, function() {
                console.log("tabsInfoCont is sync-ed.");
    });
});