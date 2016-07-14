'use strict';

//var paragraphs = document.getElementsByTagName('p');


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

/*
 * 1. Highlight the selected text 
 * 2. Insert JS for annotation panel 
 * 3. Verify the length of text (min and max) (TODO)
 * 4. Automatically extend to the nearest textual words if the selection contains partial word (TODO)
 http://stackoverflow.com/questions/7563169/detect-which-word-has-been-clicked-on-within-a-text
 * 5. Can not highlight a string with existing highlighted words (TODO)
 */
function highlight() {
    var id = generateId();
    var textNode = getSelection().getRangeAt(0);
    if (textNode.toString().length > 1) {
        var sNode = document.createElement("span");
        sNode.id = id;
        sNode.className = "annotate-highlight";

        textNode.surroundContents(sNode);
        var panel = appendPanel(id);


        var parent = getSelection().anchorNode.parentNode;
        while (parent != null && parent.localName.toLowerCase() != "p") {
            parent = parent.parentNode;
        }

        if (parent != null) {
            var pidx = getParagraphIndex(parent);
            console.log(pidx);
            var widx = getWordIndex(parent, textNode);

            sNode.setAttribute('value', pidx + ',' + widx);
        }

        $("#" + id).mouseenter(function() {
            console.log(id + " mouse enter");
            if (panel.is(':hidden')) {
                panel.show();
            }
        });

        return id;
    }
}


// Return the paragraph idx (starts at 0) and occurrence idx (starts at 1).

function getParagraphIndex(p) {
    var paragraphs = document.getElementsByTagName('p');
    console.log("total paras " + paragraphs.length);
    var i = 0;
    for (; i < paragraphs.length; i++) {
        if (p.isSameNode(paragraphs[i])) {
            return i;
        }
    }
    return -1;
}


// find the occurence of the word in preceding string. 
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




// TODO: show the system's translation in the textarea
function appendPanel(id) {
    var highlightWords = $("#" + id);
    var rect = cumulativeOffset2(id);
    console.log("rect: " + rect.left + " " + rect.top);

    var panelID = id + "_panel";
    var editorID = id + "_editor";

    var panelHtml = '<div id=\"' + panelID + '\" class=\"panel\">';
    panelHtml += '<textarea id=\"' + editorID + '\" style="background:yellow"></textarea><br>';
    panelHtml += '<div class=\"btn-group\" style=\"margin:5px;\">'
    panelHtml += '<button type=\"delete\" class=\"btn btn-info btn-xs\">Delete</button> &nbsp;';
    panelHtml += '<button type=\"cancel\" class=\"btn btn-info btn-xs\">Cancel</button> &nbsp;';
    panelHtml += '<button type=\"submit\" class=\"btn btn-info btn-xs\">Submit</button>';
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
            panel.remove();
            highlightWords.contents().unwrap();
        } else {
            // TODO: fix bug
            console.log("save");
            panel.hide();
            saveAnnotation(editorID);
        }
    })

    panel.mouseleave(function() {
        panel.hide();
    })

    return panel;
}

function saveAnnotation(editorID) {
    // not empty
    if (!$("#F" + editorID).val().match(/^\s*$/)) {
        a.ann.onlyInGroup || !a.ann.saved || a.getCommentCount("private", a.ann.comments) == 0 ? a.addPrivateComment() : a.uploadPrivateComment();
        a.privateEditOn(false);
        a.privateEditing = false
    }

}

function showPanel() {
    $(this).style.visibility = "visible";
}

function hidePanel() {
    $(this).style.visibility = "hidden";
}

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
    return (new Date).getTime().toString() + Math.floor(Math.random() * 100000)
}

function showDiv() {
    $("#test").toggle();
}


function paintCursor() {
    var cursor = chrome.extension.getURL('highlighter-orange.cur');
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
            var id = highlight();
            console.log($("#" + id));
        });
        paintCursor();
    } else {
        console.log(request.mode);
        unpaintCursor();
    }

});
