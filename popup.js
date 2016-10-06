//TODO: Need to remove isWorking from learn.js, annotate.js and content-share.js

//These variables are only "alive" as long as popup.html is showing
var userId = -1; // this is user internal id
var categoryParameter = '';
var wordDisplay = ''; //0: in target language, 1: in source language
var wordsLearn = ''; // number of words to learn
var websiteSetting = '';
var translationUrl = '';
var annotationLanguage = ''; // TODO: init this according to users' setting
var learnLanguage = ''; // TODO: init this according to user's setting
var currentTabID;
var modeLookUpTable = ["disable", "learn", "annotate"];
var mostAnnotatedArticle = 10;
var currentTabInfo = undefined;
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
    //var mode = modeLookUpTable[currentTabInfo.mode];
    //setMode(mode);            
    
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
    
    document.getElementById('learnt').innerHTML = '-';
    document.getElementById('toLearn').innerHTML = '-';
    console.log("show learning history")
    $.ajax({
        type: "post",
        beforeSend: function(request) {
            request.setRequestHeader("Accept", "application/json");
        },
        url: hostUrl + '/show_user_learning_history',
        data: {
            user_id: userId,
            lang: currentTabInfo.ann_lang
        },
        success: function(result) {
            console.log("show user learning history successful.");
            console.log(result);
            document.getElementById('learnt').innerHTML = result.history.learnt_count;
            document.getElementById('toLearn').innerHTML = result.history.learning_count;
        },
        error: function (error) {
            console.log("show user learning history error.");
            alert(error.responseText);
        } 
    });
    
    showAnnotationHistory();    
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
                        currentTabInfo = response;
                        updatePopupUI(currentTabInfo);
                        setMode(modeLookUpTable[currentTabInfo.mode]); 
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
    chrome.storage.sync
        .get(
            null, //
            function(result) {
                console.log(result);
                userId = result.userId;

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
                learnLanguage = result.learnLanguage;
                annotationLanguage = result.annotationLanguage;
                
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
            });
}

//TODO: Need to update wordsLearn variable at background.js
function setWordReplace() {   
   $('#wordsLearn').on('slide', function(slideEvt) {
        updateTabSettings({wordsLearn: slideEvt.value}, false);                       
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
                console.log(translationType);
                var translationTypeShortForm = "";
                if (translationType.indexOf('ims') >= 0) {                    
                    translationTypeShortForm = 'ims';
                    $("#translationUrl #imsTranslations").addClass(
                        'active btn-primary');
                } else if (translationType.indexOf('dictionary') >= 0) {
                    translationTypeShortForm = 'dict';
                    $("#translationUrl #dictionaryTranslations")
                        .addClass('active btn-primary');
                } else {
                    // this one uses Bing translator
                    translationTypeShortForm = 'bing';
                    $("#translationUrl #bingTranslations").addClass(
                        'active btn-primary');
                }
                reload();
                chrome.runtime.sendMessage(
                    { type: "change_translation", tab_id: currentTabID, translationType: translationTypeShortForm },
                    function(response) {
                        //console.log("New tab message sent.");
                    }
                ); 
            });
}


function setQuizGenerator() {
    $('#quizGenerator .btn')
        .click(
            function() {
                $("#quizGenerator .btn").removeClass('active');
                $("#quizGenerator .btn").removeClass('btn-primary');
                $("#quizGenerator .btn").addClass('btn-default');

                var quizType = $(this).attr('id');
                console.log(quizType);
                var quizTypeShortForm = "";
                if (quizType.indexOf('semantic') >= 0) {                    
                    quizTypeShortForm = 'semantic';
                    $("#quizGenerator #semanticSimilarWords").addClass(
                        'active btn-primary');
                } else if (quizType.indexOf('recent') >= 0) {
                    quizTypeShortForm = 'recent';
                    $("#quizGenerator #recentWords")
                        .addClass('active btn-primary');
                } 
                reload();
                chrome.runtime.sendMessage(
                    { type: "change_quiz", tab_id: currentTabID, quizType: quizTypeShortForm },
                    function(response) {
                        //console.log("New tab message sent.");
                    }
                ); 
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
    } else if (mode == 'disable') {
        learn.style.display = 'none';
        annotate.style.display = 'none';
        disable.style.display = 'block';
    }
}

function setAnnotationLanguage() {
    $('#annotate-panel .bfh-selectbox').on('change.bfhselectbox', function() {
        annotationLanguage = $(this).val();
        console.log("set annotation language on popup.html: " + annotationLanguage);
        updateTabSettings({ann_lang: annotationLanguage}, true);
        showAnnotationHistory();
        //Update the annotation links with the newly selected language
        setAnnotationLinks();
    });
}

function setLearnLanguage() {
    learnLanguage = $('#learn-panel .bfh-selectbox').val();
    $('#learn-panel .bfh-selectbox').on('change.bfhselectbox', function() {
        learnLanguage = $(this).val();
        console.log("set learning language on popup.html: " + learnLanguage);
        //Send message to background.js to update the tab settings
        updateTabSettings({learn_lang: learnLanguage}, false);
    });
}

function showAnnotationHistory() {
    console.log(currentTabInfo);
    $.ajax({
        type: "get",
        beforeSend: function(request) {
            request.setRequestHeader("Accept", "application/json");
        },
        url: hostUrl + '/show_user_annotation_history',
        data: {
            user_id: userId,
            lang: currentTabInfo.ann_lang
        },
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

function updateTabSettings (tabSettings, updateMode) {
    chrome.runtime.sendMessage(
        { type: "update_tab", tab_id: currentTabID, settings: tabSettings, update_mode: updateMode },
        function(response) { }
    );
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
        
        updateTabSettings({wordDisplay: wordDisplay}, true);
                
        //console.log("change replaced lang to " + wordDisplay);
        //
        //chrome.storage.sync.set({
        //    'wordDisplay': wordDisplay
        //}, function() {
        //    reload();
        //});
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

}

//Set link for the buttons
function setLinks() {
    
    $('#learn-seen-btn').click(function() {
        window.open(hostUrl + '/show_user_words?user_id=' + userId + '&lang=' + learnLanguage + '&is_learning=1');
    });
    
    $('#learn-learnt-btn').click(function() {
        window.open(hostUrl + '/show_user_words?user_id=' + userId + '&lang=' + learnLanguage + '&is_learning=0');
    });

    $('#setting').click(function() {
        window.open(hostUrl + '/settings?user_id=' + userId);
    });
    // http://testnaijia.herokuapp.com/howtouse
    $('#learn-tutorial').click(function() {
        window.open(hostUrl + '/how-to-learn');
    });

    $('#annotate-tutorial').click(function() {
        window.open(hostUrl + '/how-to-annotate');
    });

    $('#sign-up').click(function() {
        window.open(hostUrl + '/sign_up?user_id=' + userId);
    });

    $('#login').click(function() {
        window.open(hostUrl + '/login');
    });

    $('#fb-recommend').click(function() {
        chrome.runtime.sendMessage(
            { type: "send_fb_recommend", tab_id: currentTabID },
            function(response) { }
        );
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
    	var url = hostUrl + '/show_most_annotated_urls?user_id=' + userId + '&lang=' + annotationLanguage + '&num='+mostAnnotatedArticle;
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
    setQuizGenerator();
}

window.onload = onWindowLoad;
