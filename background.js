
/**
 * Obtains a OAuth2 token_id from google. Validate the token_id with the backend and obtain the email to be
 * used as the idenfifier of the user.
 */
chrome.storage.sync.get(null, function(result) {
    var manifest = chrome.runtime.getManifest();

    var clientId = encodeURIComponent(manifest.oauth2.client_id);
    var scopes = encodeURIComponent(manifest.oauth2.scopes.join(' '));
    var redirectUri = encodeURIComponent('https://' + chrome.runtime.id + '.chromiumapp.org');

    var url = 'https://accounts.google.com/o/oauth2/auth' + 
              '?client_id=' + clientId + 
              '&response_type=id_token' + 
              '&access_type=offline' + 
              '&redirect_uri=' + redirectUri + 
              '&scope=' + scopes;

    if (!result.hasOwnProperty('userAccount')) {
        console.log("Initialising new user account");
        chrome.identity.launchWebAuthFlow(
            {
                'url': url, 
                'interactive':false
            }, 
            function(redirectedTo) {
                if (chrome.runtime.lastError) {
                    console.log(chrome.runtime.lastError.message);
                } else {
                    // Example: id_token=<YOUR_BELOVED_ID_TOKEN>&authuser=0&hd=<SOME.DOMAIN.PL>&session_state=<SESSION_SATE>&prompt=<PROMPT>
                    var response = redirectedTo.split('#', 2)[1];

                    var id_token = response.match(/id_token=(.*)&authuser/)[1];

                    $.post('https://wordnews-mobile.herokuapp.com/validate_google_id_token',
                        {
                            'id_token': id_token
                        }
                    ).done(function(data) {
                        var userAccount = data['email'];
                        chrome.storage.sync.set({'userAccount': userAccount});
                    });

                }
            }
        );
    }
});
