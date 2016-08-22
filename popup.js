var HttpClient = function() {
    this.get = function(aUrl, aCallback) {
        anHttpRequest = new XMLHttpRequest();
        anHttpRequest.onreadystatechange = function() {
            if (anHttpRequest.readyState == 4 && anHttpRequest.status == 200) {
                aCallback(anHttpRequest.responseText);
            }

        }
        anHttpRequest.open('GET', aUrl, true);
        anHttpRequest.send(null);
    }
}

//var hostUrl = 'http://wordnews-annotate.herokuapp.com';
var hostUrl = 'https://wordnews-server-kite19881.c9users.io'
//var hostUrl = 'http://wordnews.herokuapp.com/';
//var hostUrl = 'http://localhost:3000/';

//TODO: Need to remove isWorking from learn.js, annotate.js and content-share.js

//These variables are only "alive" as long as popup.html is showing
var userAccount = ''; //this is username
var userId = -1; // this is user internal id
var categoryParameter = '';
var wordDisplay = ''; //0: in target language, 1: in source language
var wordsLearn = ''; // number of words to learn
var websiteSetting = '';
var translationUrl = '';
var annotationLanguage = '';
var learnLanguage = '';
var currentTabID;
var modeLookUpTable = ["disable", "learn", "annotate"];
var mostAnnotatedArticle = 10;

var websiteSetting = [];

//This function will inject all the the scripts
function programmaticInjection () {
    var js = [  "jquery-2.1.1.min.js",
                "slider/js/bootstrap-slider.js",
                "bootstrap/js/bootstrap-formhelpers.min.js",
                "bootstrap/js/bootstrap.min.js",
                "content-share.js",
                "annotate.js",
                "learn.js"        
             ];
             
    for (var i = 0; i < js.length; ++i) {
        chrome.tabs.executeScript(null, {file: js[i], runAt: "document_end"});
    }
    
    var css = [ "gt_popup_css_compiled.css",
                "gt_bubble_gss.css",
                "slider/css/slider.css",
                "bootstrap/css/bootstrap.min.css",
                "bootstrap/css/bootstrap-formhelpers.min.css",
                "annotate.css"   
              ];
              
    for (var i = 0; i < css.length; ++i) {
        chrome.tabs.insertCSS(null, {file: css[i], runAt: "document_end"});
    }        
    
}

function updatePopupUI (currentTabInfo) {
    var mode = modeLookUpTable[currentTabInfo.mode];
    setMode(mode);            
    
    //Update Learn language UI
    $('#learn-panel .bfh-selectbox').val(currentTabInfo.learn_lang);
    //Update Annotation language UI
    $('#annotate-panel .bfh-selectbox').val(currentTabInfo.ann_lang);
    
    //Update Words learn UI
    if (currentTabInfo.wordsDisplay == 0) { // show target (e.g., Chinese)
        document.getElementById('displaySource').className = 'btn btn-default';
        document.getElementById('displayTarget').className = 'btn btn-primary active';
    } else {
        document.getElementById('displaySource').className = 'btn btn-primary active';
        document.getElementById('displayTarget').className = 'btn btn-default';
    }    
    console.log(currentTabInfo);
    //Update wordsLearn UI;
    $('#wordsLearn').slider({
        precision: 2,
        value: currentTabInfo.wordsLearn
            // Slider will instantiate showing 8.12 due to
            // specified precision
    });
    
}

function initalize() {
    //Shift tab query call to outside to ensure that currentTabID is initialized before entering next
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function(arrayOfTabs) {
        //Get the current tab id 
        currentTabID = arrayOfTabs[0].id;        
        //Grab all the data from the google local storage
        chrome.storage.local.get(null, function (result) {                        
            var currentTabInfo = undefined;
            if (result.hasTabs) {
                //Use the current tab id to get the tab information
                currentTabInfo = result.tabsInfoCont[currentTabID];
            }             
            console.log(currentTabInfo);
            //If current tab info is undefined, it means this a new tab
            if (currentTabInfo == undefined) {              
                //Send message to background to register the new tab
                chrome.runtime.sendMessage(
                    { type: "new_tab", tab_id: currentTabID },
                    function(response) {
                        //background.js will respond back with current tab info to update the UI
                        console.log("New tab message sent.");         
                        //console.log("New tab response", response);
                        updatePopupUI(response);
                    }
                );
            } else {                
                updatePopupUI(currentTabInfo);                
            }            
        });     
    });
}

//TODO: Need to revamp this whole function!
function syncUser() {            
    //chrome.storage.sync.clear();
    
    chrome.storage.sync
        .get(
            null, //
            function(result) {
                userAccount = result.userAccount;
                userId = result.userId;
                
                if (userAccount == undefined || typeof userAccount == "string") {

                    //This temporary method of generating will not create a true unique ID
                    var i = new Date().getTime();;
                    i = i & 0xffffffff;
                    userAccount = (i + Math.floor(Math.random() * i)); //'id' + d.getTime() + '_1';

                    chrome.storage.sync.set({
                        'userAccount': userAccount
                    }, function() {});
                }
                // console.log('userAccount ' + userAccount);

                // Ask the server to generate the User ID
                if (userId == undefined) {
                    $.ajax({
                        type : "get",
                        beforeSend : function(request) {
                            request.setRequestHeader("Accept", "application/json");
                        },
                        url : hostUrl + "/get_user_id_by_user_name",
                        dataType : "json",
                        data : {         
                        	user_name: userAccount
                        },
                        success : function(result) { // get successful and result returned by server
                        	if ('user_id' in result) {
                                userId = result['user_id'];
                                chrome.storage.sync.set({
                                    'userId': userId
                                }, function() {});
                            }
                        },
                        error : function(result) {
                            console.log( "get user id failed" );
                        }
                    });  
                }               

                translationUrl = result.translationUrl || "http://wordnews-mobile.herokuapp.com/";
                console.log('transUrl', translationUrl);
                if (translationUrl.indexOf('mobile') >= 0) {
                    document.getElementById('dictionaryTranslations').className = 'btn btn-default';
                    document.getElementById('imsTranslations').className = 'btn btn-default';
                    document.getElementById('bingTranslations').className = 'btn btn-primary active';
                } else if (translationUrl.indexOf('wordnews') >= 0 && translationUrl.indexOf('ims') < 0) {
                    document.getElementById('dictionaryTranslations').className = 'btn btn-primary active';
                    document.getElementById('imsTranslations').className = 'btn btn-default';
                    document.getElementById('bingTranslations').className = 'btn btn-default';
                } else {
                    document.getElementById('dictionaryTranslations').className = 'btn btn-default';
                    document.getElementById('imsTranslations').className = 'btn btn-primary active';
                    document.getElementById('bingTranslations').className = 'btn btn-default';
                }
                                
                websiteSetting = result.websiteSetting;
                
                console.log('websiteSetting '+ websiteSetting);
                if (websiteSetting == undefined) {
                    websiteSetting = [1,3];//'cnn.com & bbc.co';
                    // console.log('Set to default website setting');
                    chrome.storage.sync.set({
                        'websiteSetting': websiteSetting
                    });
                }
                //Update the UI
                for (var i = 0; i < websiteSetting.length; ++i) {
                    document.getElementById('inlineCheckbox' + websiteSetting[i]).checked = true;
                }                

                // TODO: use $.get()
                var remembered = new HttpClient();
                var answer;

                document.getElementById('learnt').innerHTML = '-';
                document.getElementById('toLearn').innerHTML = '-';

                remembered.get(
                    hostUrl + '/getNumber?name=' + userAccount,
                    function(answer) {
                        var obj = JSON.parse(answer);
                        if ('learnt' in obj) {
                            document
                                .getElementById('learnt').innerHTML = obj['learnt'];
                        }
                        if ('toLearn' in obj) {
                            document
                                .getElementById('toLearn').innerHTML = obj['toLearn'];
                        }
                    }
                );
                showAnnotationHistory();
            });
}

//TODO: Need to update wordsLearn variable at background.js
function setWordReplace() {
    $('#wordsLearn').on('slide', function(slideEvt) {
        chrome.storage.sync.set({
            'wordsLearn': slideEvt.value
        });
    });
}

function setWebsite() {
    $('input').change(function() {
        console.log("Set Website");
        websiteSetting = [];
        //Iterate the checkbox, as for now, there is only 3 checkboxes      
        for (var i = 1; i <= 3; ++i)
        {
            if (document.getElementById('inlineCheckbox' + i).checked) {
                websiteSetting.push(i);
            }
        }
        chrome.storage.sync.set({
            'websiteSetting': websiteSetting
        });        
    });
}

function setTranslation() {
    $('#translationUrl .btn')
        .click(
            function() {
                $("#translationUrl .btn").removeClass('active');
                $("#translationUrl .btn").removeClass('btn-primary');
                $("#translationUrl .btn").addClass('btn-default');

                var translationType = $(this).attr('id');
                if (translationType.indexOf('ims') >= 0) {
                    chrome.storage.sync
                        .set({
                            'translationUrl': 'http://imsforwordnews.herokuapp.com/show'
                        });
                    $("#translationUrl #imsTranslations").addClass(
                        'active btn-primary');
                } else if (translationType.indexOf('dictionary') >= 0) {
                    chrome.storage.sync
                        .set({
                            'translationUrl': 'http://wordnews.herokuapp.com/show_by_dictionary'
                        });
                    $("#translationUrl #dictionaryTranslations")
                        .addClass('active btn-primary');
                } else {
                    // this one uses Bing translator
                    chrome.storage.sync
                        .set({
                            'translationUrl': hostUrl + '/show'
                        });
                    $("#translationUrl #bingTranslations").addClass(
                        'active btn-primary');
                }
                reload();
            });
}


function setModeCallback() {
    $('#mode .btn').click(function() {
        // "this" refers to the button element
        var mode = $(this).attr('id'); // This will returns a string 
        setMode(mode);
    });
}

function setMode(mode) {
    $("#mode .btn").removeClass('active');
    $("#mode .btn").removeClass('btn-primary');
    $("#mode .btn").addClass('btn-default');
    
    $("#mode #" + mode).addClass('active btn-primary');
    showDivByMode(mode);
    //switchLogo(mode);
    mode_enum = modeLookUpTable.indexOf(mode);
    chrome.runtime.sendMessage(
        { type: "mode", tab_id: currentTabID, mode: mode_enum },
        function(response) {
            //console.log("New tab message sent.");
        }
    );    
}

function addAnnotationContextMenu() {
    /*
     * chrome.contextMenus.create({ title: "WordNews (Annotate)", contexts:
     * ["selection"],
     * 
     * onclick: function () { alert("select") chrome.tabs.executeScript({ code:
     * "window.getSelection().toString();" }, function (selection) {
     * document.getElementById("output").value = selection[0];
     * alert(selection[0]); }); } //onclick: select() });
     * console.log("addAnnotationContextMenu");
     */
}

function removeAnnotationContextMenu() {
    console.log("removeAnnotationContextMenu");
    chrome.contextMenus.removeAll();
}

function showDivByMode(mode) {
    var learn = document.getElementById('learn-panel');
    var annotate = document.getElementById('annotate-panel');
    var disable = document.getElementById('disable-panel');

    if (mode == 'learn') {
        learn.style.display = 'block';
        annotate.style.display = 'none';
        disable.style.display = 'none';
    } else if (mode == 'annotate') {
        learn.style.display = 'none';
        annotate.style.display = 'block';
        disable.style.display = 'none';
    }
    if (mode == 'disable') {
        learn.style.display = 'none';
        annotate.style.display = 'none';
        disable.style.display = 'block';
    }
}

function setAnnotationLanguage() {
    $('#annotate-panel .bfh-selectbox').on('change.bfhselectbox', function() {
        annotationLanguage = $(this).val();
        console.log("set annotation language on popup.html: " + annotationLanguage);

        chrome.runtime.sendMessage(
            { type: "update_tab", tab_id: currentTabID, settings: {ann_lang: annotationLanguage}, update_mode: true },
            function(response) {                
                console.log("Updated annotation language.");                               
            }
        );
        showAnnotationHistory();
        //Update the annotation links with the newly selected language
        setAnnotationLinks();
    });
}

function setLearnLanguage() {
    $('#learn-panel .bfh-selectbox').on('change.bfhselectbox', function() {
        learnLanguage = $(this).val();
        console.log("set learning language on popup.html: " + learnLanguage);
        //Send message to background.js to update the tab settings
        chrome.runtime.sendMessage(
            { type: "update_tab", tab_id: currentTabID, settings: {learn_lang: learnLanguage}, update_mode: false },
            function(response) {                
                console.log("Updated learn language.");               
                //TODO: Check whether is there a need to update learn with new language selected
            }
        );
    });
}

function showAnnotationHistory() {
    $.ajax({
        type: "get",
        beforeSend: function(request) {
            request.setRequestHeader("Accept", "application/json");
        },
        url: hostUrl + '/show_user_annotation_history?user_id=' + userId + '&lang=' + annotationLanguage,
        success: function(obj) {
            if ('history' in obj) {
                document.getElementById('annotations').innerHTML = obj['history']['annotation'];
                document.getElementById('articles').innerHTML = obj['history']['url'];
            } else {
            	 document.getElementById('annotations').innerHTML = '-';
                 document.getElementById('articles').innerHTML = '-';
            }
        }
    });
}

// TODO: refine code
//       and shift this to tab level settings
function setReplace() {
	
	$('#displayLanguage .btn').click(function() {
		$("#displayLanguage .btn").removeClass('active');
        $("#displayLanguage .btn").removeClass('btn-primary');
        $("#displayLanguage .btn").addClass('btn-default');
        
        $(this).addClass("active btn-primary");

        // "this" refers to the button element
        var id = $(this).attr('id'); // This will returns a string 
        console.log("display btn id " + id);
        if (id=='displaySource') {
        	wordDisplay = 1;
        } else { //displayTarget
        	wordDisplay = 0;
        }
        
        console.log("change replaced lang to " + wordDisplay);
        
        chrome.storage.sync.set({
            'wordDisplay': wordDisplay
        }, function() {
            reload();
        });
    });
}

function reload() {
    console.log("reload");
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function(arrayOfTabs) {
        var code = 'window.location.reload();';
        chrome.tabs.executeScript(arrayOfTabs[0].id, {
            code: code
        });
    });

    // window.location.reload();
    // chrome.tabs.reload();

}

function setLinks() {
    $('#learn-panel .btn-block').click(function() {
        window.open(hostUrl + '/displayHistory?name=' + userAccount);
    });
    // http://testnaijia.herokuapp.com/settings?name='+userAccount'
    $('#setting').click(function() {
        window.open(hostUrl + '/settings?name=' + userAccount);
    });
    // http://testnaijia.herokuapp.com/howtouse
    $('#learn-tutorial').click(function() {
        window.open(hostUrl + '/how-to-learn');
    });

    $('#annotate-tutorial').click(function() {
        window.open(hostUrl + '/how-to-annotate');
    });

    setAnnotationLinks();
}

function setAnnotationLinks() {
    $('#annotate-panel .btn-block').click(function() {
        if ($(this).val() == 'annotations') {
            window.open(hostUrl + '/show_user_annotations?user_id=' + userId + '&lang=' + annotationLanguage);
        } else if ($(this).val() == 'urls'){
            window.open(hostUrl + '/show_user_annotated_urls?user_id=' + userId + '&lang=' + annotationLanguage);
        }
    });
    
    $('#annotate-panel #most-annotated .btn').click(function() {
    	var url = hostUrl + '/show_most_annotated_urls?lang=' + annotationLanguage + '&num='+mostAnnotatedArticle;
    	var today = new Date().toJSON().slice(0,10);
    
        if ($(this).val() == 'today') {
            window.open(url + '&from_date=' + today + '&to_date='+today);
        } else if ($(this).val() == 'week'){
        	var oneWeekAgo = new Date();
        	oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        	oneWeekAgo = oneWeekAgo.toJSON().slice(0,10);
        	
            window.open(url + '&from_date=' + oneWeekAgo + '&to_date='+today);        	
        } else {
            window.open(url);        	        	
        }
    });
}

function onWindowLoad() {
    initalize();
    syncUser();
    setWordReplace();
    setWebsite();
    setTranslation();
    setModeCallback();
    setReplace();
    setAnnotationLanguage();
    setLearnLanguage();
    setLinks();
}

window.onload = onWindowLoad;
