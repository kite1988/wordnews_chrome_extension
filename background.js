
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
