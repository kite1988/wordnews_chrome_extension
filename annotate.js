'use strict';

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
 * 3. Verify the lenght of text (min and max) 
 * 4. Automatically extend to the nearest textual words if the selection contains partial word
 */
function highlight() {
	var id = generateId();
	var textNode = getSelection().getRangeAt(0);
    if(textNode.toString().length > 1){
		var sNode = document.createElement("span");
		sNode.id = id;
		sNode.style.background="yellow";
	
		textNode.surroundContents(sNode);
		//var panel = appendPanel(id);
	
		/*
		$("#" + id).mouseenter(function() {
			if (panel.is(':hidden')) {
				panel.show();
			}
		});
		*/
		return id;
    }
}

function appendPanel(id) {
	var highlightWords = $("#" + id);
	var rect = cumulativeOffset2(id);
	console.log("rect: " + rect.left + " " + rect.top);

	var panelID = id + "_panel";
	var antId = id + "_ant";

	var panelHtml = '<div id=\"' + panelID + '\">';
	panelHtml += '<textarea id=\"' + antId + '\"></textarea>';
	panelHtml += '<br> <button type=\"delete\">Delete</button><button type=\"cancel\">Cancel</button><button type=\"submit\">Submit</submit> </div>';

	$("body").append(panelHtml);

	var panel = document.getElementById(panelID);
	panel.style.position = "absolute";
	panel.style.left = (rect.left - 20) + 'px';
	panel.style.top = (rect.top + 20) + 'px';
	panel.style.background = 'yellow';
	//panel.show();
	panel = $(panel);

	$("#" + panelID + " button").click(function() {
		mode = $(this).attr('type');
		if (mode == 'cancel') {
			panel.hide();
		} else if (mode == 'delete') {
			panel.remove();
			highlightWords.contents().unwrap();
		} else {
			// TODO: fix bug
			console.log("save");
			panel.hide();
			saveAnnotation();
		}
	})

	panel.mouseleave(function() {
		panel.hide();
	})

	return panel;
}

function saveAnnotation() {

}

function checkSelection() {
	var a, c, d = {
		ok : false,
		msg : "",
		txt : "",
		html : "",
		nth : -1
	};
	f = null;

	if (window.getSelection) {
		a = window.getSelection();
		d.html = range2html(c = a.getRangeAt(0));
		d.ok = true;

	}
}

// a: range
function range2html(a) {
	return this.stripScripts(a.htmlText == undefined ? $("<div></div>").append(
			a.cloneContents()).html() : a.htmlText)
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
	var top = 0, left = 0;
	do {
		top += element.offsetTop || 0;
		left += element.offsetLeft || 0;
		element = element.offsetParent;
	} while (element);

	return {
		top : top,
		left : left
	};
}

function generateId() {
	return (new Date).getTime().toString() + Math.floor(Math.random() * 100000)
}

function showDiv() {
	$("#test").toggle();
}

// Locate a specified string
// a: target string, c: paragraph, d?
function findOccurrences(a, c, d) {
	for (var f = [], h = 0, i = 0, l = 0; (h = c.indexOf(a, i)) > -1;) {
		l++;
		i = h + 1;
		f.push(h);
		if (d != undefined && l >= d)
			break
	}
	return f
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
	console.log(sender.tab ? "from a content script:" + sender.tab.url
			: "from the extension");
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

