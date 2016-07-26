'use strict';

var paragraphs = document.getElementsByTagName('p');

var selectionMaxNoOfWords = 5;
var selectionMinNoOfWords = 1;

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
        if( range.startOffset == 0)
        {
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

//This function will take in the text node and check whether is there any annoation existed under this node
function checkAnnoationExisted(node)
{
    var parentElem = null;
    
    //Get the parent node element
    parentElem = node.commonAncestorContainer;
    if (parentElem.nodeType != 1) {
        parentElem = parentElem.parentNode;
    }
    
    if (hasClass(parentElem, "annotate-highlight"))
    {
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
        
        var parent = getSelection().anchorNode.parentNode;
        while (parent != null && parent.localName.toLowerCase() != "p") {
            parent = parent.parentNode;
        }
        var pidx = 0;
        var widx = 0;
        if (parent != null) {
            pidx = getParagraphIndex(parent);
            console.log(pidx);
            widx = getWordIndex(parent, textNode);

            sNode.setAttribute('value', pidx + ',' + widx);
        }
        
        var panel = appendPanel(annotationPanelID, textNode.toString(), userId, pidx, widx);
        
        $("#" + annotationPanelID).mouseenter(function() {
            console.log(annotationPanelID + " mouse enter");
            if (panel.is(':hidden')) {
                panel.show();
            }
        });

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

// find the occurrence of the selected text in preceding string. 
function getWordIndex(p, textNode) {
    var precedingRange = document.createRange();
    precedingRange.setStartBefore(p.firstChild);
    precedingRange.setEnd(textNode.startContainer, textNode.startOffset);

    var precedingText = precedingRange.toString();
    var count = 0;
    for (var i = 0; i < precedingText.length;) {
        var idx = precedingText.indexOf(textNode.toString(), i);
        if (idx > 0) {
            count++;
            i = idx + 1;
        } else {
            i++;
        }
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
		ann_id: -1, // annotation id - TODO: the server needs to generate a unique ID for annotation
		selected_text: '',
		translation: '', //This variable cannot be empty
		lang: 'zh', // language of the translation, obtained from user's configuration. set default to zh (Chinese)
		paragraph_idx: -1, // paragraph idx
		text_idx: -1, // the idx in the occurrence of the paragraph 
		url: '', // url of the article
        state: annotationState.NEW // state to determine whether the annontation existed in the database
};

// TODO: To save annotator's effort, we will show the system's translation 
// in the textarea as default translation, and thus annotator can edit it.
function appendPanel(annotationPanelID, word, userId, paragrahIndex, wordIndex) {
    var highlightWords = $("#" + annotationPanelID);
    var rect = cumulativeOffset2(annotationPanelID);
    console.log("rect: " + rect.left + " " + rect.top);

    var panelID  = annotationPanelID + "_panel";
    var editorID = annotationPanelID + "_editor";

    var panelHtml = '<div id=\"' + panelID + '\" class=\"panel\" data-state=\"' + annotationState.NEW  + ' \"data-id=\"0\">';
    panelHtml += '<textarea id=\"' + editorID + '\" style="background:yellow"></textarea><br>';
    panelHtml += '<div class=\"btn-group\" style=\"margin:5px;\">'
    panelHtml += '<button id=\"annontation-delete-btn' + annotationPanelID + '\" type=\"delete\" class=\"btn btn-info btn-xs\">Delete</button> &nbsp;';
    panelHtml += '<button id=\"annontation-cancel-btn' + annotationPanelID + '\" type=\"cancel\" class=\"btn btn-info btn-xs\">Cancel</button> &nbsp;';
    panelHtml += '<button id=\"annontation-submit-btn' + annotationPanelID + '\" type=\"submit\" class=\"btn btn-info btn-xs\">Submit</button>';
    panelHtml += '</div></div>';

    $("body").append(panelHtml);

    var panel = document.getElementById(panelID);
    panel.style.position = "absolute";
    panel.style.left = (rect.left - 20) + 'px';
    panel.style.top = (rect.top + 20) + 'px';
    panel.className = "annotate-panel";

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
            
        } else {
            // TODO: fix bug
            console.log("save");
            panel.hide();
            saveAnnotation(annotationPanelID, word, userId, editorID, paragrahIndex, wordIndex);
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
    console.log(annotationPanelID);
    //Get the translated word
    var textAreaElem = document.getElementById(editorID);
    //TODO: Have not supported unicode for non-english input in textarea
    $.post( hostUrl + "/create_annotation", // for experiments        
        {            
            annotation: {
                ann_id: annotationPanelID, 
                user_id: userId,
                selected_text: word,
                translation: textAreaElem.value,
                lang: "zh",
                url: window.location.href,
                paragraph_idx: paragrahIndex,
                text_idx: wordIndex
            }            
        }, 
        function (result) { // success        
            console.log( "add annotaiton post success", result );          
            if (result.msg == "OK") {
                //Change the state of the annotation from new to existed
                var panelID  = annotationPanelID + "_panel";
                $('#' + panelID).data('state', annotationState.EXISTED);
                $('#' + panelID).data('id', result.id); // add the annotation id from server
            }
            else {
                console.log(result.msg);
            }
            
        }
    )
    .fail(function(result) {
        console.log( "add annotation post error", result );
    });  
}

//Send to server to remove annoation
function deleteAnnotationFromServer(annotationPanelID) {	
    //Need to check the state of the annotation
    var state = $('#' + annotationPanelID + "_panel").data('state');
    //If the annotation existed in database, send request to remove it
    if(state == annotationState.EXISTED)
    {
        var annotationID = $('#' + annotationPanelID + "_panel").data('id');
        $.get( hostUrl + "/delete_annotation", // for experiments
            {            
                id: annotationID       
            }
        )
        .done(function() {
            console.log( "delete annotaiton post success" );            
        })
        .fail(function() {
            console.log( "delete annotation post error" );
        });
    }
}

// TODO： show all the highlights and annotations
function showAnnotations() {

	
}


// TODO: inject annotation panel div as well
function showAnnotation(ann) {
    if (paragraphs.length < ann.paragraph_idx) {
        console.log("layout changed");
        return;
    }

    var para = paragraphs[pidx];
    var innerHtml = para.innerHTML;
    console.log(para);

    var count = 0;
    for (var i=0; i<innerHtml.length; ) {
        var idx = innerHtml.indexOf(ann.selected_text, i);
        if (idx>0) {
            count++;
            if (count==ann.text_idx) {
                var before = innerHtml.slice(0, idx);
                var after = innerHtml.slice(idx+ann.selected_text.length);
                // TODO: inject annotation div as well
                var html = '<span class=\"highlight\">' + ann.selected_text + '</span>';
                para.innerHTML = before + html + after;
                return;
            } 
        } 
        i++;
    }
    console.log("Cannot find the " + text + "  in paragraph " + pid);	
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
    if (request.mode == "annotate") {
        console.log("annotate");
        $('body').on("mouseup", 'p', function(e) {
            var id = highlight(request.user_id);
            if (id == -1)
            {
                console.log("Error: Unable to create annotation");
            }
            console.log($("#" + id));
        });
        paintCursor();
    } else {
        console.log(request.mode);
        unpaintCursor();
    }

});
