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
    // var hostUrl = 'http://wordnews.herokuapp.com/';
    // var hostUrl = 'http://localhost:3000/';

var userAccount = ''; //this is username
var userId = -1; // this is user internal id
var isWorking = ''; // 0: disable, 1: learn, 2: annotation
var categoryParameter = '';
var wordDisplay = ''; //0: in target language, 1: in source language
var wordsLearn = ''; // number of words to learn
var websiteSetting = '';
var translationUrl = '';
var annotationLanguage = '';
var learnLanguage = '';


function syncUser() {
    chrome.storage.sync
        .get(
            null,
            function(result) {
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
                // console.log('userAccount ' + userAccount);

                // Ask the server to generate the User ID
                if (userId == undefined) {
                    $
                        .get(
                            hostUrl + '/get_user_id_by_user_name?user_name=' + userAccount,
                            function(obj) {

                                //var obj = JSON.parse(answer);
                                if ('user_id' in obj) {
                                    userId = obj['user_id'];
                                    // console.log('id: ' + userId + ', user name: ' + userAccount);

                                    chrome.storage.sync.set({
                                        'userId': userId
                                    }, function() {});
                                }
                            });
                }


                isWorking = result.isWorking;
                if (isWorking == undefined) {
                    isWorking = 1;
                    chrome.storage.sync.set({
                        'isWorking': isWorking
                    });
                }
                // console.log('isWorking '+isWorking);

                $("#mode .btn").removeClass('active');
                $("#mode .btn").removeClass('btn-primary');
                $("#mode .btn").addClass('btn-default');

                if (isWorking == 0) { // disable
                    $("#mode #disable").addClass('active btn-primary');
                    unpaintCursor();
                    showDivByMode('disable');
                    switchLogo('disable');

                } else if (isWorking == 1) { // learn
                    $("#mode #learn").addClass('active btn-primary');
                    unpaintCursor();
                    showDivByMode('learn');
                    switchLogo('learn');

                } else { // annotate
                    $("#mode #annotate").addClass('active btn-primary');
                    paintCursor();
                    showDivByMode('annotate');
                    switchLogo('annotate');
                }

                wordDisplay = result.wordDisplay;
                if (wordDisplay == undefined) {
                    wordDisplay = 1;
                    chrome.storage.sync.set({
                        'wordDisplay': wordDisplay
                    });
                }
                console.log('wordDisplay ' + wordDisplay);
                if (wordDisplay == 0) { // show target (e.g., Chinese)
                    document.getElementById('displaySource').className = 'btn btn-default';
                    document.getElementById('displayTarget').className = 'btn btn-primary active';
                } else {
                    document.getElementById('displaySource').className = 'btn btn-primary active';
                    document.getElementById('displayTarget').className = 'btn btn-default';
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

                wordsLearn = result.wordsLearn;
                // console.log('wordsLearn '+wordsLearn);
                if (wordsLearn == undefined) {
                    wordsLearn = 2;
                    // console.log('Set to default wordsLearn
                    // setting');
                    chrome.storage.sync.set({
                        'wordsLearn': wordsLearn
                    });
                } else {
                    // document.getElementById('wordsLearn').value =
                    // wordsLearn;
                    $('#wordsLearn').slider({
                        precision: 2,
                        value: wordsLearn
                            // Slider will instantiate showing 8.12 due to
                            // specified precision
                    });
                }

                websiteSetting = result.websiteSetting;
                // console.log('websiteSetting '+websiteSetting);
                if (websiteSetting == undefined) {
                    websiteSetting = 'cnn.com_bbc.co';
                    // console.log('Set to default website setting');
                    chrome.storage.sync.set({
                        'websiteSetting': websiteSetting
                    });
                }
                if (websiteSetting.indexOf('cnn.com') !== -1) {
                    document.getElementById('inlineCheckbox1').checked = true;
                }
                if (websiteSetting.indexOf('chinadaily.com.cn') !== -1) {
                    document.getElementById('inlineCheckbox2').checked = true;
                }
                if (websiteSetting.indexOf('bbc.co') !== -1) {
                    document.getElementById('inlineCheckbox3').checked = true;
                }
                if (websiteSetting.indexOf('all') !== -1) {
                    document.getElementById('inlineCheckbox4').checked = true;
                }

                // Learn language
                learnLanguage = result.learnLanguage;
                if (learnLanguage == null) {
                    chrome.storage.sync.set({
                        'learnLanguage': 'zh_CN'
                    }, function() {});
                }
                $('#learn-panel .bfh-selectbox').val(learnLanguage);
                

                // TODO: use $.get()
                var remembered = new HttpClient();
                var answer;

                document.getElementById('learnt').innerHTML = '-';
                document.getElementById('toLearn').innerHTML = '-';

                remembered
                    .get(
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
                        });

                // Annotation language
                annotationLanguage = result.annotationLanguage;
                if (annotationLanguage == null) {
                    chrome.storage.sync.set({
                        'annotationLanguage': 'zh_CN'
                    }, function() {});
                }
                $('#annotate-panel .bfh-selectbox').val(annotationLanguage);
                
                showAnnotationHistory();
            });
}

function setWordReplace() {
    $('#wordsLearn').on('slide', function(slideEvt) {
        chrome.storage.sync.set({
            'wordsLearn': slideEvt.value
        });
    });
}

function setWebsite() {
    $('input').change(function() {

        websiteSetting = '';
        if (document.getElementById('inlineCheckbox1').checked == true) {
            if (websiteSetting !== '')
                websiteSetting += '_';
            websiteSetting += document.getElementById('inlineCheckbox1').value;
        }

        if (document.getElementById('inlineCheckbox2').checked == true) {
            if (websiteSetting !== '')
                websiteSetting += '_';
            websiteSetting += document.getElementById('inlineCheckbox2').value;
        }
        if (document.getElementById('inlineCheckbox3').checked == true) {
            if (websiteSetting !== '')
                websiteSetting += '_';
            websiteSetting += document.getElementById('inlineCheckbox3').value;
        }

        // Comment out temporarily for now, to prevent the use of 'All website'
        /*
         * if(document.getElementById('inlineCheckbox4').checked == true) {
         * if(websiteSetting !== '') websiteSetting += '_'; websiteSetting+=
         * document.getElementById('inlineCheckbox4').value; }
         */

        chrome.storage.sync.set({
            'websiteSetting': websiteSetting
        });
        chrome.storage.sync.get('websiteSetting', function(result) {
            // TODO: why? should be websiteSetting = result.websiteSetting
            userAccount = result.websiteSetting;
            // console.log('user websiteSetting: '+ result.websiteSetting);
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

                translationUrl = $(this).attr('id');
                if (translationUrl.indexOf('ims') >= 0) {
                    chrome.storage.sync
                        .set({
                            'translationUrl': 'http://imsforwordnews.herokuapp.com/show'
                        });
                    $("#translationUrl #imsTranslations").addClass(
                        'active btn-primary');
                } else if (translationUrl.indexOf('dictionary') >= 0) {
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
                            'translationUrl': translationUrl + '/show'
                        });
                    $("#translationUrl #bingTranslations").addClass(
                        'active btn-primary');
                }
                reload();
            });
}

function setMode() {
    $('#mode .btn').click(function() {
        $("#mode .btn").removeClass('active');
        $("#mode .btn").removeClass('btn-primary');
        $("#mode .btn").addClass('btn-default');

        mode = $(this).attr('id');
        if (mode == 'learn') {
            isWorking = 1;
            chrome.storage.sync.set({
                'isWorking': isWorking
            });

            $("#mode #learn").addClass('active btn-primary');
            showDivByMode('learn');
            switchLogo('learn');
            unpaintCursor();

        } else if (mode == 'annotate') {
            isWorking = 2;
            chrome.storage.sync.set({
                'isWorking': isWorking
            });

            $("#mode #annotate").addClass('active btn-primary');
            showDivByMode('annotate');
            switchLogo('annotate');
            paintCursor();
            //window.close();

        } else { // disable
            isWorking = 0;
            chrome.storage.sync.set({
                'isWorking': isWorking
            });

            $("#mode #disable").addClass('active btn-primary');
            showDivByMode('disable');
            switchLogo('disable');

            // removeAnnotationContextMenu();
            unpaintCursor();
        }

        // TODO: Why call this?
        chrome.storage.sync.get(null, function(result) {
            isWorking = result.isWorking;
            console.log('user isworking: ' + result.isWorking);
        });

        // TODO: this function does not execute sometimes
        // alert("before");
        //reload();
    });
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

function paintCursor() {
    console.log("paint cursor");
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function(arrayOfTabs) {
        //var cursor = chrome.extension.getURL('images/highlighter-orange.cur');
        //console.log(cursor);
        chrome.tabs.sendMessage(arrayOfTabs[0].id, { mode: "annotate", user_id: userId, ann_lang: annotationLanguage },
            function(response) {});

    });
}

function unpaintCursor() {
    console.log("unpaint");
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function(arrayOfTabs) {
        chrome.tabs.sendMessage(arrayOfTabs[0].id, { mode: "unannotate" }, function(response) {});
    });
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
        chrome.storage.sync.set({
            'annotationLanguage': annotationLanguage
        });
        
        showAnnotationHistory();
        setAnnotationLinks();

        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function(arrayOfTabs) {
            chrome.tabs.sendMessage(arrayOfTabs[0].id, { ann_lang: annotationLanguage }, function(response) {});
        });
        
        //window.close();
    });
}



function setLearnLanguage() {
    $('#learn-panel .bfh-selectbox').on('change.bfhselectbox', function() {
        learnLanguage = $(this).val();
        console.log("set learning language on popup.html: " + learnLanguage);
        chrome.storage.sync.set({
            'learnLanguage': learnLanguage
        });

        /*chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function(arrayOfTabs) {
            chrome.tabs.sendMessage(arrayOfTabs[0].id, { learn_lang: learnLanguage }, function(response) {});
        });*/

        //window.close();
    });
}


function showAnnotationHistory() {
	$.ajax({
        type: "get",
        beforeSend: function(request) {
            request.setRequestHeader("Accept", "application/json");
        },
        url: hostUrl + '/show_user_annotation_history?user_id=359&lang='+annotationLanguage,
        success: function(obj) {
            if ('history' in obj) {
                document.getElementById('annotations').innerHTML = obj['history']['annotation'];
                document.getElementById('articles').innerHTML = obj['history']['url'];
            }
        }
    });
}


// TODO: a new logo for annotation?
function switchLogo(mode) {
    if (mode == 'disable') {
        var imgURL = chrome.extension.getURL("images/logo-gray.png");
        chrome.browserAction.setIcon({ path: imgURL });
    } else if (mode == 'annotate') {
        var imgURL = chrome.extension.getURL("images/logo.png");
        chrome.browserAction.setIcon({ path: imgURL });
    } else {
        var imgURL = chrome.extension.getURL("images/logo.png");
        chrome.browserAction.setIcon({ path: imgURL });
    }
}

// TODO: refine code
function setReplace() {
    $('.btn-toggle').click(function() {
        if (!isWorking) {
            return;
        }

        if ($(this).attr('id') == 'displayLanguage') {
            $(this).find('.btn').toggleClass('btn-default');
            $(this).find('.btn').toggleClass('active');

            if (wordDisplay === 1) {
                wordDisplay = 0;
                chrome.storage.sync.set({
                    'wordDisplay': wordDisplay
                });
            } else {
                wordDisplay = 1;
                chrome.storage.sync.set({
                    'wordDisplay': wordDisplay
                });
            }

            chrome.storage.sync.get(null, function(result) {
                wordDisplay = result.wordDisplay;
                // console.log('user isworking: '+ result.wordDisplay);
            });
        }

        if ($(this).find('.btn-primary').size() > 0) {
            $(this).find('.btn').toggleClass('btn-primary');
        }
        if ($(this).find('.btn-danger').size() > 0) {
            $(this).find('.btn').toggleClass('btn-danger');
        }
        if ($(this).find('.btn-success').size() > 0) {
            $(this).find('.btn').toggleClass('btn-success');
        }
        if ($(this).find('.btn-info').size() > 0) {
            $(this).find('.btn').toggleClass('btn-info');
        }
        reload();
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
            window.open(hostUrl + '/show_user_annotations?user_id=' + userId + '&lang='+annotationLanguage);
        } else {
            window.open(hostUrl + '/show_user_annotation_urls?user_id=' + userId + '&lang='+annotationLanguage);
        }
    });
}


function onWindowLoad() {
    syncUser();
    setWordReplace();
    setWebsite();
    setTranslation();
    setMode();
    setReplace();
    setAnnotationLanguage();
    setLearnLanguage();
    setLinks();
}

window.onload = onWindowLoad;
