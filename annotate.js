'use strict';

// Note cnn used ".zn-body__paragraph" instead of p
var paragraphFormatTag;
var paragraphs = getParagraphs();// = document.getElementsByTagName('p');
var website;

var selectionMaxNoOfWords = 5;
var selectionMinNoOfWords = 1;
var annotationLanguage = '';
//A container to keep all the annotations' panel ID
var annotationPanelIDCont = [];

var hostUrl = "https://wordnews-server-kite19881.c9users.io";
//var hostUrl = "https://wordnews-annotate.herokuapp.com";

function selectHTML() {
    try {
        var nNd = document.createElement("em");
        var w = getSelection().getRangeAt(0);
        w.surroundContents(nNd);
        return nNd.innerHTML;
    } catch (e) {
        return getSelection();
    }
}

function isValidString(str)
{
    return !/[~`!#$%\^&*+=\\[\]\\';,./{}|\\":<>\?\s]/g.test(str);
}

// This function will get the whole word from selection. 
// If the selection is incomplete, e.g "ar" from "harm" is selected, 
// it will get the word "harm"
function getTextNodeFromSelection()
{
    //Get the selection
    var textNode = getSelection();
    var range = textNode.getRangeAt(0);
    var node = textNode.anchorNode;        
    var offset = true; // Bool check for offsetting
    
    //If the number of words is more than selectionMaxNoOfWords
    var noOfWords = range.toString().split(" ").length;
    
    if (noOfWords >= selectionMaxNoOfWords)
    {
        console.log("More than 5 words")
        return [true, range];
    }
    
    if (range.startOffset > range.endOffset)
    {
        return [true, range];
    }

    //Loop backwards until we find the special character to break
    while (isValidString(range.toString()[0]))
    {
        //If the start offset is 0, break the loop since offset cannot be < 0
        if( range.startOffset == 0) {
            offset = false;
            break;
        }
        range.setStart(node, (range.startOffset - 1));
        //console.log(range.toString());
    }
    
    //Align to first character after the special character
    if (offset)
    {
        range.setStart(node, range.startOffset + 1);
    }

    offset = true; //Reset bool to true
    var lastIndex = range.toString().length - 1;
    //Loop forward until we find the special character to break
    do {        
        if (range.endOffset + 1 > node.length)
        {
            offset = false;
            break;
        }
        range.setEnd(node, range.endOffset + 1);     
        lastIndex++;
        //console.log(range.toString());
    } while (isValidString(range.toString()[lastIndex]));
    
    //Align to last character before the special character
    if (offset)
    {
        range.setEnd(node, range.endOffset - 1);
    }    
    //console.log(range.toString());
    
    return [false, range];
}

//Function to check whehter class exist with a given name
function hasClass(element, cls) {
    return (' ' + element.className + ' ').indexOf(' ' + cls + ' ') > -1;
}

function getParentElem(node)
{
    var parentElem = null;
    
    //Get the parent node element
    parentElem = node.commonAncestorContainer;
    if (parentElem.nodeType != 1) {
        parentElem = parentElem.parentNode;
    }
    
    return parentElem;
}
//This function will take in the text node and check whether is there any annoation existed under this node
function checkAnnoationExisted(node)
{
    var parentElem = getParentElem(node);
    
    
    if (hasClass(parentElem, "annotate-highlight")) {
        console.log("annotate class existed")        
        return true;
    }    
    return false;
}

/*
 * 1. Highlight the selected text 
 * 2. Insert JS for annotation panel 
 * 3. Verify the length of text (min and max)
 * 4. Automatically extend to the nearest textual words if the selection contains partial word 
 	  http://stackoverflow.com/questions/7563169/detect-which-word-has-been-clicked-on-within-a-text
 * 5. Can not highlight a string with existing highlighted words  
 */
function highlight(userId ) {    
    
    var result =  getTextNodeFromSelection();
    var textNode = result[1];
    var error = result[0]
    error = error || checkAnnoationExisted(textNode);
    
    if (!error && textNode.toString().length > 1) 
    {            
        //Generate an unique ID for the annotation 
        var annotationPanelID = generateId(); 
        var sNode = document.createElement("span");
        sNode.id = annotationPanelID;
        sNode.className = "annotate-highlight";      
        try
        {
            textNode.surroundContents(sNode);        
        }
        catch(err)
        {
            console.log(err);
            return -1
        }          
        
        var parent = getParentElem(textNode);
        var pidx = 0;
        var widx = 0;
        if (parent != null) {
            pidx = getParagraphIndex(parent);
            console.log(pidx);
            widx = getWordIndex(parent, textNode);
            sNode.setAttribute('value', pidx + ',' + widx);
        }
        
        var panel = appendPanel(annotationPanelID, textNode.toString(), userId, pidx, widx, annotationState.NEW, 0);
        
        return annotationPanelID;
    }
    else if (textNode.toString().length != 0 ) {
        //TODO: Show a proper UI such as notification for error        
        return -1;
    }        
}

function getParagraphIndex(p) {
    var i = 0;
    for (; i < paragraphs.length; i++) {
        if (p.isSameNode(paragraphs[i])) {
            return i;
        }
    }
    return -1;
}

//TODO: This function exists in contentscript.js
function getParagraphs() {
	var paragraphs;
    
    if (document.URL.indexOf('cnn.com') !== -1) {
        paragraphs = $('.zn-body__paragraph').get();
        paragraphFormatTag = '.zn-body__paragraph';
        website = "cnn";
    } else {
        paragraphs = document.getElementsByTagName('p');
        paragraphFormatTag = 'p'
        website = "other";
    }
    return paragraphs;
}

//Find the occurrence of the selected text in preceding string which is
//all of the text before the selected text. 
function getWordIndex(p, textNode) {    
    var precedingRange = document.createRange();
    precedingRange.setStartBefore(p.firstChild);
    precedingRange.setEnd(textNode.startContainer, textNode.startOffset);
    //Cache the strings 
    var precedingText = precedingRange.toString();
    var selectedText = textNode.toString();
    var count = 0;    
    var idx = precedingText.indexOf(selectedText); //Get the index of the selected text
    while (idx < precedingText.length && idx != -1) {   
        ++count;            
        //Get the next index of the selected text
        idx = precedingText.indexOf(selectedText, idx + 1);
    }
    return count;
}

//This function will remove current element which contains annotation and 
//combine the data with previous and next
function removeAnnotationElement(elem)
{
    var addNext = false;    
    var nextElem = elem.nextSibling;
    
    if (!hasClass(nextElem, "annotate-highlight"))
    {       
        nextElem.data = elem.innerHTML + nextElem.data;
        addNext = true;
    }
    
    var prevElem = elem.previousSibling;
    //if the previous sibings is not an annotation class
    if (!hasClass(nextElem, "annotate-highlight"))
    {
        if (addNext) //if there is a need to add in next
        {
            prevElem.data +=  nextElem.data
            nextElem.remove();
        }
        else //just add in the current element text
        {
            prevElem.data +=  elem.innerHTML
        }
    }
    elem.remove()
}

var annotationState = {
    NEW: 1,
    EXISTED: 2    
};

var annotation = {
    id: -1,  // the internal id in database
    user_id: -1, // user id
    ann_id: -1, // annotation panel id
    selected_text: '',
    translation: '', //This variable cannot be empty
    lang: 'zh', // language of the translation, obtained from user's configuration. set default to zh (Chinese)
    paragraph_idx: -1, // paragraph idx
    text_idx: -1, // the idx in the occurrence of the paragraph, starts from 0
    url: '', // url of the article
    state: annotationState.NEW // state to determine whether the annontation existed in the database
};

function updatePanelPosition (annotationPanelID) {
    var rect = cumulativeOffset2(annotationPanelID);
    console.log("rect: " + rect.left + " " + rect.top);
    var panelID  = annotationPanelID + "_panel";
    var panel = document.getElementById(panelID);
    panel.style.position = "absolute";
    panel.style.left = (rect.left - 20) + 'px';
    panel.style.top = (rect.top + 20) + 'px';
    panel.className = "annotate-panel";
}

// TODO: To save annotator's effort, we will show the system's translation 
// in the textarea as default translation, and thus annotator can edit it.
function appendPanel(annotationPanelID, word, userId, paragrahIndex, wordIndex, state, id) {
    var highlightWords = $("#" + annotationPanelID);   
    var panelID  = annotationPanelID + "_panel";
    var editorID = annotationPanelID + "_editor";
    
    var lang = BFHLanguagesList[annotationLanguage.split('_')[0]]; // in native language
    var country = annotationLanguage.split('_')[1];
    
    var panelHtml = '<div id=\"' + panelID + '\" class=\"panel\" data-state=\"' + state  + ' \"data-id=\"' + id + '\">';
    panelHtml += '<span class=\"bfh-languages\" data-language=\"' + 
    			 annotationLanguage + '\" data-flags=\"true\">' + 
    			 '<i class="glyphicon bfh-flag-'+country+ '" title="' + lang + '"></i></span><br>';
    panelHtml += '<textarea id=\"' + editorID + '\" style="background:yellow"></textarea><br>';
    panelHtml += '<div class=\"btn-group\" style=\"margin:5px;\">'
    panelHtml += '<button id=\"annontation-delete-btn' + annotationPanelID + '\" type=\"delete\" class=\"btn btn-info btn-xs\">Delete</button> &nbsp;';
    panelHtml += '<button id=\"annontation-cancel-btn' + annotationPanelID + '\" type=\"cancel\" class=\"btn btn-info btn-xs\">Cancel</button> &nbsp;';
    panelHtml += '<button id=\"annontation-submit-btn' + annotationPanelID + '\" type=\"submit\" class=\"btn btn-info btn-xs\">Submit</button>';
    panelHtml += '</div></div>';

    $("body").append(panelHtml);
    
    annotationPanelIDCont.push(annotationPanelID); //Add panel ID to container

    updatePanelPosition(annotationPanelID);    
    var panel = document.getElementById(panelID);    
    panel = $(panel);

    $("#" + panelID + " button").click(function() {
        var mode = $(this).attr('type');
        if (mode == 'cancel') {
            panel.hide();
        } else if (mode == 'delete') {
            deleteAnnotationFromServer(annotationPanelID);
            var elem = document.getElementById(annotationPanelID);            
            removeAnnotationElement(elem)
            //Remove the panel HTML
            panel.remove();
            highlightWords.contents().unwrap();            
            var index = annotationPanelIDCont.indexOf(annotationPanelID);
            annotationPanelIDCont.splice(index, 1); //Remove it from container
        } else {
            // TODO: fix bug
            console.log("save");
            panel.hide();
            saveAnnotation(annotationPanelID, word, userId, editorID, paragrahIndex, wordIndex);
        }
    });
    
    $("#" + annotationPanelID).mouseenter(function() {
        console.log(annotationPanelID + " mouse enter");
        if (panel.is(':hidden')) {
            panel.show();
        }
    });

    panel.mouseleave(function() {
        panel.hide();
    });  
    
    //Set submit botton to be disabled as default
    $('#annontation-submit-btn' + annotationPanelID).prop('disabled', true);    
    
    //Toggle disable of submit button according the text entered in text field
    $('#' + editorID).on('keyup', function() {         
            
        if (this.value.length > 0) {
            $('#annontation-submit-btn' + annotationPanelID).prop('disabled', false);    
        }    
        else {
            $('#annontation-submit-btn' + annotationPanelID).prop('disabled', true);    
        }
    });      

    return panel;
}

// TODO: send to server to add annotation
function saveAnnotation(annotationPanelID, word, userId, editorID, paragrahIndex, wordIndex) {	
    
    //Get the translated word
    var textAreaElem = document.getElementById(editorID);
    
    var state = $('#' + annotationPanelID + "_panel").data('state');
    //If the annotation is newly created, send data to server to add into database
    if(state == annotationState.NEW) {
        //TODO: Have not supported unicode for non-english input in textarea
    	$.ajax({
			type : "post",
			beforeSend : function(request) {
				request.setRequestHeader("Accept", "application/json");
			},
			url : hostUrl + "/create_annotation",
			dataType : 'json',
			data : {
				annotation: {
                    ann_id: annotationPanelID, //This is annotation panel id
                    user_id: userId,
                    selected_text: word,
                    translation: textAreaElem.value,
                    lang: annotationLanguage,
                    url: window.location.href,
                    paragraph_idx: paragrahIndex,
                    text_idx: wordIndex
                }   
			},
			success : function(result) { // post successful and result returned by server
				console.log( "add annotaiton post success", result );          
                
                //Change the state of the annotation from new to existed
                var panelID  = annotationPanelID + "_panel";
                $('#' + panelID).data('state', annotationState.EXISTED);
                $('#' + panelID).data('id', result.id); // add the annotation id from server
			},

			error : function(result) {
				console.log("add annotation post error" + result);
			}
		});
    }        
    else {
        var annotation_id = $('#' + annotationPanelID + "_panel").data('id');
        $.get( hostUrl + "/update_annotation",
            {
                id: annotation_id,
                translation: textAreaElem.value  
            },
            function (result) { // get successful and result returned by server
                console.log( "update annotaiton get success", result );      
            }        
        )
        .fail(function(result) {
            console.log( "update annotation get error", result );
        });
    }
}

//Send to server to remove annoation
function deleteAnnotationFromServer(annotationPanelID) {	
    //Need to check the state of the annotation
    var state = $('#' + annotationPanelID + "_panel").data('state');
    //If the annotation existed in database, send request to remove it
    if(state == annotationState.EXISTED)
    {
        var annotationID = $('#' + annotationPanelID + "_panel").data('id');
        $.ajax({
			type : "get",
			beforeSend : function(request) {
				request.setRequestHeader("Accept", "application/json");
			},
			url : hostUrl + "/delete_annotation",
			dataType : "json",
			data : {			
                id: annotationID                   
			},
			success : function(result) { // getsuccessful and result returned by server
				console.log( "delete annotaiton get success" );    
			},
			error : function(result) {
				console.log( "delete annotation get error" );
			}
		});
    }
}

// TODO： show all the highlights and annotations
function showAnnotations(userid) {
    $.ajax({
        type : "get",
        beforeSend : function(request) {
            request.setRequestHeader("Accept", "application/json");
        },
        url : hostUrl + "/show_annotation_by_user_url",
        dataType : "json",
        data : {            
            user_id: userid,
            url: window.location.href,
            lang: annotationLanguage
        },
        success : function(result) { // get successful and result returned by server
            for (var i = 0; i < result.annotations.length; ++i) {
                showAnnotation(result.annotations[i]);
            }    
        },
        error : function(result) {
            console.log( "show annotation get error" );
        }
    });
}

function showAnnotation(ann) {
    if (paragraphs.length < ann.paragraph_idx) {
        console.log("layout changed");
        return;
    }
    annotationPanelIDCont.push(ann.ann_id); //Add panel ID to container
    var para = paragraphs[ann.paragraph_idx];
    var innerHtml = para.innerHTML;
    console.log(para);

    var count = 0;
    var idx = innerHtml.indexOf(ann.selected_text);   
    while (idx != -1) { //Iterate the whole <p> to find the selected word                              
        if (count == ann.text_idx) { //If count is equals to the number word occurance 
            //Get the before and after text from selected text
            var before = innerHtml.slice(0, idx);
            var after = innerHtml.slice(idx + ann.selected_text.length);
            //Create <span> HTML tag and add to the middle
            var html = '<span id=\"' + ann.ann_id + '\" class=\"annotate-highlight\" value=\"' + ann.paragraph_idx + ',' + idx + '\">' + ann.selected_text + '</span>';
            para.innerHTML = before + html + after;
            
            var panel = appendPanel(ann.ann_id, ann.selected_text, ann.user_id, ann.paragraph_idx, count, annotationState.EXISTED, ann.id);        
            //Add translated text to textarea
            var editorID = ann.ann_id + "_editor";
            var textAreaElem = document.getElementById(editorID);
            textAreaElem.value = ann.translation;         
            
            return;                    
        }      
        ++count; 
        idx = innerHtml.indexOf(ann.selected_text, idx + 1); //Searching the word starting from idx
    }
    console.log("Cannot find the " + ann.selected_text + "  in paragraph " + ann.paragraph_idx);	
}


function showPanel() {
    $(this).style.visibility = "visible";
}

function hidePanel() {
    $(this).style.visibility = "hidden";
}

// Duplicate with the cumulativeOffset() in contentscript.js
// TODO: Remove
function cumulativeOffset2(id) {
    var element = document.getElementById(id);
    console.log("id " + element);
    var top = 0,
        left = 0;
    do {
        top += element.offsetTop || 0;
        left += element.offsetLeft || 0;
        element = element.offsetParent;
    } while (element);

    return {
        top: top,
        left: left
    };
}

function generateId() {    
    //This method creates semi-unique ID
    var i = new Date().getTime();
    i = i & 0xffffffff;
    //console.log(i);
    return (i + Math.floor(Math.random() * i));
}


function paintCursor() {
    var cursor = chrome.extension.getURL('images/highlighter-orange.cur');
    console.log(cursor);
    document.body.style.cursor = "url(" + cursor + "),auto";
}

function unpaintCursor() {
    window.location.reload();
    $('body').unbind("mouseup", 'p');
}

// add listeners
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
    //console.log(request);
    if ('mode' in request) {
	    if (request.mode == "annotate") {
            annotationLanguage = request.ann_lang;
	        console.log("annotate mode lang:" + annotationLanguage);
            //TODO: Need to get the main framework to send new page(includes refreshed page) event
            showAnnotations(request.user_id);
          
            $('body').on("mouseup", paragraphFormatTag, function(e) {
                var id = highlight(request.user_id);
                if (id == -1)
                {
                    console.log("Error: Unable to create annotation");
                }
                console.log($("#" + id));
            });            
            
            paintCursor();	        
	    } else if (request.mode == "unannotate"){
	        console.log(request.mode);
	        unpaintCursor();
	    }
    } else if ('ann_lang' in request) {
        annotationLanguage = request.ann_lang;
    	console.log("update lang to " + annotationLanguage);
    }
});

//TODO: Need check again whether is there any function being called when onsize event is triggered
window.onresize = function() { //Resize all annotation panel according to the new resized window
    for (var i = 0; i < annotationPanelIDCont.length; ++i) {
        updatePanelPosition(annotationPanelIDCont[i]);
    }         
};


