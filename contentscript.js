'use script';
// Is this above meant to be 'use strict'?

var url_front = "http://translatenews.herokuapp.com/";
//var url_front = "http://localhost:3000/";


var userAccount = "";
var isWorking = "";
var categoryParameter = "";
var wordDisplay = "";
var wordsReplaced = "";
var pageDictionary = {};
var vocabularyListDisplayed;
var displayID = "";
var appendContentDictionary = {};
var websiteSetting = "";

var startTime;


function talkToHeroku(url, params, index){
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

    xhr.onreadystatechange = function() {//Call a function when the state changes.
	if(xhr.readyState == 4 && xhr.status == 200) {
	    //console.log("here?");

	    var response = xhr.responseText.replace(/&quot;/g,'"');
	    var obj=JSON.parse(response);
	    console.log(obj);

	    var sourceWords = [];
	    var targetWords = [];
	    var isTest = [];
	    var pronunciation = [];
	    var choices1 = {};
	    var choices2 = {};
	    var choices3 = {};
	    var wordID = [];
	    var count = 0;
	    for (var x in obj) {
		if(count >= wordsReplaced){
		    count++;
		    continue;
		}
		count++;
		sourceWords.push(x);
		targetWords.push(obj[x].chinese);
		isTest.push(obj[x].isTest);
		pageDictionary[x] = obj[x].chinese;

		if(obj[x].pronunciation !== undefined){
		    pronunciation.push(obj[x].pronunciation);
		}
		else{
		    pronunciation.push("/pronunciation/");
		}

		if(obj[x].wordID !== undefined){
		    wordID.push(obj[x]["wordID"]);
		}
		else{
		}

		if(obj[x].isTest == 1 || obj[x].isTest == 2){
		    choices1[x.toLowerCase()] = obj[x]["choices"]["0"];
		    choices2[x.toLowerCase()] = obj[x]["choices"]["1"];
		    choices3[x.toLowerCase()] = obj[x]["choices"]["2"];
		    //console.log("other english is : "+obj[x]["choices"]["2"]);
		}
		else{
		    choices1[x.toLowerCase(] = " ";
		    choices2[x.toLowerCase(] = " ";
		    choices3[x.toLowerCase(] = " ";
		}
                var isChoicesProvided = obj[x].isChoicesProvided;
                
                if (!isChoicesProvided) {
                    // make a seperate request to get the quiz options
		    var httpClient = new HttpClient();
		    httpClient.get(url_front+'getQuiz.json?word='+ +'&category='+'Technology'+'&level=3', function(quizOptions) {
                        var choices = quizOptions[x]['choices'];
                        choices1[x.toLowerCase()] = choices['0'];
                        choices2[x.toLowerCase()] = choices['1'];
                        choices3[x.toLowerCase()] = choices['2'];
	                
		     });

                }
		//console.log(x+" "+obj[x]+" "+obj[x].isTest);
	    }

	    startTime = new Date();  // this is used to track the time between each click

	    replaceWords(sourceWords, targetWords, isTest, pronunciation, wordID, choices1, choices2 , choices3, index);

	    //document.getElementById('article').innerHTML  = obj["chinese"];
	}
	else {// Show what went wrong
	    //document.getElementById('article').innerHTML  = "Something Went Wrong";
	}
    }
    xhr.send(params);
}


function replaceWords(sourceWords, targetWords, isTest, pronunciation, wordID, choices1, choices2 , choices3, i){

    var paragraphs = document.getElementsByTagName('p');


    for(var j = 0;j < sourceWords.length; j++){

	var sourceWord = sourceWords[j];
	var targetWord = targetWords[j];

	var paragraph = paragraphs[i];
	var text = paragraph.innerHTML;


	var id = "myID_"+sourceWord+"_"+wordID[j]+"_"+i.toString()+"_"+isTest[j];


	var popoverContent = "";
	var joinString = "";
	pronunciation[j] = pronunciation[j].replace("5","");
	if(isTest[j] == 0) { // no quiz

	    var splitedPinyin = pronunciation[j].split(" ");
	    var chineseCharactors = targetWord.replace("(","").replace(")","").split("");


	    joinString += '  <span ';
	    joinString += "id = '"+id+"'";
	    joinString += 'class = "fypSpecialClass" ';
	    joinString += 'style="text-decoration:underline; font-weight: bold; "';
	    joinString += 'data-placement="above" ';

	    joinString += 'id = "' + id + '" >';
	    if(wordDisplay == 1)
		joinString += sourceWord;
	    else
		joinString += targetWord;
	    joinString += '</span>  ';


	    var append = '<div id=\"'+ id + '_popup\" class="jfk-bubble gtx-bubble" style="visibility: visible;  opacity: 1;">';
	    append += '<div class="jfk-bubble-content-id"><div id="gtx-host" style="min-width: 200px; max-width: 400px;">';
	    append += '<div id="bubble-content" style="min-width: 200px; max-width: 400px;" class="gtx-content">';
	    append += '<div class="content" style="border: 0px; margin: 0">';
	    append += '<div id="translation" style="min-width: 200px; max-width: 400px; display: inline;">';
	    append += '<div class="gtx-language">ENGLISH</div>';
	    append += '<div class="gtx-body" style="padding-left:21px;">'+sourceWord+'</div><br>';
	    append += '<div class="gtx-language">CHINESE (SIMPLIFIED)</div>';
	    append += '<p style = "margin: 0px;padding-left:10px;">';
	    for(var k = 0; k < splitedPinyin.length; k++){
		append += '<img style="height:21px;width:21px;display:inline-block;opacity:0.55;vertical-align:middle;background-size:91%;-webkit-user-select: none;-webkit-font-smoothing: antialiased;" class="audioButton"  id="'+splitedPinyin[k]+'" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAQAAABKfvVzAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAACjSURBVDjLY2AYYmA1QwADI3FKy8HkfyA8zqBOjPL/YLqO4SWQ9YXBmbDy/1C2EMMGsBZNQsr/w/lMDCuAvKOElP+HeloQSPIxPAPynVAV/seAENHtYLoKyJpDnIb/DOZA2gBI3yRWQx6Q5gZ7nFYaQE4yJN5JW8B0PaanYaADRcMaBh5wsD7HDFZMLURGHEIL0UkDpoWExAfRQlLyJiMDDSAAALgghxq3YsGLAAAAAElFTkSuQmCC" >'
		    append += chineseCharactors[k];
	    }
	    for(var k = 0; k < splitedPinyin.length; k++){
		append += '<audio id="myAudio_'+splitedPinyin[k]+'" style = "display: none;">'
		    append += '<source src="http://www.chinese-tools.com/jdd/public/ct/pinyinaudio/'+splitedPinyin[k]+'.mp3" type="audio/mp3">';
		append += '</audio>';
	    }
	    append += '</p>';
	    append += '<a id="myID_more" target="_blank" href="http://dict.youdao.com/search?q='+sourceWord+'&keyfrom=dict.index"  style="color: #A2A2A2; float: right; padding-top: 16px;">MORE »</a>';
	    append += '</div></div></div></div></div>';
	    append += '<div class="jfk-bubble-arrow-id jfk-bubble-arrow jfk-bubble-arrowup" style="left: 117px;">';
	    append += '<div class="jfk-bubble-arrowimplbefore"></div>';
	    append += '<div class="jfk-bubble-arrowimplafter"></div></div></div>';
	    append += '';
	    append += '';
	    append += '';
	    append += '';

	    appendContentDictionary[id+"_popup"] = append;

	}
	else {  // has quiz
 

	    popoverContent += "<div class = \"row\">";

	    var myArrayShuffle = [1, 2, 3, 4];
	    myArrayShuffle = shuffle(myArrayShuffle);

	    joinString += "  <span ";
	    joinString += "class = 'fypSpecialClass' ";
	    joinString += "style='text-decoration:underline; font-weight: bold; ' ";
	    joinString += "data-placement='above' ";
	    if(isTest[j] == 1) {
		joinString += "title='Which of the following is the corresponding English word?' ";
	    } else if (isTest[j] == 2) {
		joinString += "title='Which of the following is the corresponding Chinese word?' ";
            }
	    joinString += "href='#' ";
	    joinString += "id = '" + id + "' >";
	    if(isTest[j] == 1) {
		joinString += targetWord;
	    } else {
		joinString += sourceWord;
            }
	    joinString += "</span>  ";


	    var append = '<div id=\"'+ id + '_popup\" class="jfk-bubble gtx-bubble" style="visibility: visible;  opacity: 1; padding-bottom: 40px; ">';
	    append += '<div class="jfk-bubble-content-id"><div id="gtx-host" style="min-width: 200px; max-width: 400px;">';
	    append += '<div id="bubble-content" style="min-width: 200px; max-width: 400px;" class="gtx-content">';
	    append += '<div id="translation" style="min-width: 200px; max-width: 400px; display: inline;">';
	    append += '<div style="font-size: 80%;" class="gtx-language">Choose the most appropriate translation:</div>';

	    for(var k=0;k<myArrayShuffle.length;k++)
	    {
		if(k==0||k==2)
		    append += '<div style="width: 100%;">';
		switch(myArrayShuffle[k])
		{
		    case 1:
			append += '<div id="'+wordID[j]+'_w" align="center" class="fyp_choice_class" onMouseOver="this.style.color=\'#FF9900\'" onMouseOut="this.style.color=\'#626262\'" style="font-weight: bold; cursor:pointer; color: #626262; width: 50%; float: left; padding-top: 16px;">'+choices1[targetWord.toLowerCase()]+'</div>';
			break;
		    case 2:
			append += '<div id="'+wordID[j]+'_w" align="center" class="fyp_choice_class" onMouseOver="this.style.color=\'#FF9900\'" onMouseOut="this.style.color=\'#626262\'" style="font-weight: bold; cursor:pointer; color: #626262; width: 50%; float: left; padding-top: 16px;">'+choices2[targetWord.toLowerCase()]+'</div>';
			break;
		    case 3:
			append += '<div id="'+wordID[j]+'_w" align="center" class="fyp_choice_class" onMouseOver="this.style.color=\'#FF9900\'" onMouseOut="this.style.color=\'#626262\'" style="font-weight: bold; cursor:pointer; color: #626262; width: 50%; float: left; padding-top: 16px;">'+choices3[targetWord.toLowerCase()]+'</div>';
			break;
		    case 4:
			if(isTest[j]==1)
			    append += '<div id="'+wordID[j]+'_c" align="center"' +
			    'class="fyp_choice_class" onMouseOver="this.style.color=\'#FF9900\'"' +
			    'onMouseOut="this.style.color=\'#626262\'" style="font-weight: bold;' +
			    'cursor:pointer; color: #626262; float: left; width: 50%; padding-top:'+
			    '16px;">'+ sourceWord.toLowerCase() +'</div>';
			else if(isTest[j]==2)
			    append += '<div id="'+wordID[j]+'_c" align="center"'
			    'class="fyp_choice_class" onMouseOver="this.style.color=\'#FF9900\'"' +
			    'onMouseOut="this.style.color=\'#626262\'" style="font-weight: bold;' +
			    'cursor:pointer; color: #626262; float: left; width: 50%; padding-top:'+
			    '16px;">'+targetWord.toLowerCase()+'</div>';
			break;
		    default:
			break;
		}
		if(k==1 || k==3)
		    append += "</div>";
	    }


	    append += '</div></div></div></div>';
	    append += '<div class="jfk-bubble-arrow-id jfk-bubble-arrow jfk-bubble-arrowup" style="left: 117px;">';
	    append += '<div class="jfk-bubble-arrowimplbefore"></div>';
	    append += '<div class="jfk-bubble-arrowimplafter"></div></div></div>';
	    append += '';
	    append += '';
	    append += '';
	    append += '';

	    appendContentDictionary[id+"_popup"] = append;



	}


	$(document).on("click", "input[name*='inlineRadioOptions']", function() {

	    var id = $(this).attr('id');
	    var tempWordID = $(this).attr('value').split("_")[0];
	    //console.log("word = "+word+" id = "+id);
	    var remembered = new HttpClient();
	    document.getElementById("inlineRadio1").disabled = true;
	    document.getElementById("inlineRadio2").disabled = true;
	    document.getElementById("inlineRadio3").disabled = true;
	    document.getElementById("inlineRadioCorrect").disabled = true;
	    if(document.getElementById("inlineRadioCorrect").checked == true)
	    {
		remembered.get(url_front+'remember?name='+userAccount+'&wordID='+tempWordID+'&isRemembered=1'+"&url="+document.URL, function(answer) {
			console.log("select the correct answer");
			});
		document.getElementById("alertSuccess").style.display="inline-flex";
		setTimeout(function() {$('.fypSpecialClass').popover('hide')},1000);
	    }
	    else
	    {
		remembered.get(url_front+'remember?name='+userAccount+'&wordID='+tempWordID+'&isRemembered=0'+"&url="+document.URL, function(answer) {
			console.log("select the wrong answer");
			});
		document.getElementById("alertDanger").style.display="inline-flex";
		setTimeout(function() {$('.fypSpecialClass').popover('hide')},2500);
	    }

	});

	var parts = text.split(" " + sourceWord + " ");
	var result = "";
	if(parts.length > 1)
	{
	    var n = occurrences(parts[0],"\"");
	    if(n%2 == 1)
		result += parts[0] + '"' + joinString + '"';
	    else
		result += parts[0] + joinString;
	    parts.splice(0, 1);
	}

	result += parts.join(" " + sourceWord + " ");

	paragraph.innerHTML = result;
    }

	//this is test on 2015/3/6
    var cumulativeOffset = function(element) {

	var top = 0, left = 0;
	do {
	    top += element.offsetTop  || 0;
	    left += element.offsetLeft || 0;
	    element = element.offsetParent;
	} while(element);

	return {
	    top: top,
	    left: left
	};
    };

    $(document).unbind().mousedown(function (e) {
	    e = e || window.event;
	    var id = (e.target || e.srcElement).id;
	    var thisClass = (e.target || e.srcElement).className;
	    var container = $(".jfk-bubble")


	    var currentTime = new Date();
	    var timeElapsed = currentTime - startTime; 

	    var loggingUrl = url_front + 'log?' + 'id=' + encodeURIComponent(userAccount) +
	    '&time=' + encodeURIComponent(timeElapsed) + '&move=';  // missing move param
	    var remembered = new HttpClient();

	    //console.log(container[0]);
	    console.log("000   "+container[0]);
	    console.log("class is "+thisClass);		
	    if (container[0] !== undefined) {   
		console.log("111   "+container[0]);
		if ( !container.is(e.target) && container.has(e.target).length === 0) // if the target of the click isn't the container... // ... nor a descendant of the container
		{
		    console.log("222   "+container[0]);
		    var id = container.attr('id');
		    console.log(id);
		    var englishWord = id.split('_')[1];
		    var tempWordID = id.split('_')[2];
		    var mainOrTest = id.split('_')[4];
		    console.log(mainOrTest);
		    if(mainOrTest == 0)
		    {
			remembered.get(url_front+'remember?name='+userAccount+'&wordID='+tempWordID+'&isRemembered=1'+"&url="+document.URL, function(answer) {
				console.log("this is answer: "+answer);
				});
			remembered.post(loggingUrl + 'myId_more_' + tempWordID, function(dummy) {
				console.log("log sent");
				});
		    }
		    document.body.removeChild(container[0]);
		}

		if(id == 'myID_more') {
		    console.log("222   "+container[0]);
		    remembered.post(loggingUrl + 'myId_more_wordID_' + tempWordID, function(dummy) {
			console.log("log sent");
		    });

		    id = container.attr('id');
		    console.log(id);

		    var englishWord = id.split('_')[1];
		    var tempWordID = id.split('_')[2];
		    var remembered = new HttpClient();

		    remembered.get(url_front+'remember?name='+userAccount+'&wordID='+tempWordID+'&isRemembered=0'+"&url="+document.URL, function(answer) {
			    console.log("this is answer: "+answer);
		    });
		}

		if(thisClass == 'audioButton') {
		    console.log("clicked id is "+id);
		    var myAudio = document.getElementById("myAudio_"+id);

		    remembered.post(loggingUrl + 'clickAudioButton_wordID_'+id, function(dummy) {
			console.log("log sent");
		    });

		    if (myAudio.paused) {
			myAudio.play();
		    } else {
			myAudio.pause();
		    }
		}
    
		if(thisClass == 'fyp_choice_class') {
		    console.log("clicked id isis "+id);
		    var tempWordID = id.split("_")[0];
		    var isCorrect = id.split("_")[1];
		    var remembered = new HttpClient();
		    if(isCorrect == 'c') {
			remembered.post(loggingUrl + 'correct_quiz_answer_wordId_' + tempWordID, function(dummy) {
				console.log("log sent");
			});

			remembered.get(url_front+'remember?name='+userAccount+'&wordID='+tempWordID+'&isRemembered=1'+"&url="+document.URL, function(answer) {
				console.log("select the correct answer");
			});

			$('.jfk-bubble').css("background-image", "url('https://lh4.googleusercontent.com/-RrJfb16vV84/VSvvkrrgAjI/AAAAAAAACCw/K3FWeamIb8U/w725-h525-no/fyp-correct.jpg')");				

			$('.jfk-bubble').css("background-size", "cover");

			$('.content').css("background-color", "#cafffb");
		    }
		    else {
			remembered.post(loggingUrl + 'wrong_quiz_answer_wordID_' + tempWordID, function(dummy) {
				console.log("log sent");
				});
			remembered.get(url_front+'remember?name='+userAccount+'&wordID='+tempWordID+'&isRemembered=0'+"&url="+document.URL, function(answer) {
				console.log("select the wrong answer");
				});
			$('.jfk-bubble').css("background-image", "url('https://lh6.googleusercontent.com/--PJRQ0mlPes/VSv52jGjlUI/AAAAAAAACDU/dU3ehfK8Dq8/w725-h525-no/fyp-wrong.jpg')");				
			$('.jfk-bubble').css("background-size", "cover");
		    }

		}
	    }
	});



	$(".fypSpecialClass").unbind().click(function(event) {

		var id = $(this).attr('id');

		var element = document.getElementById(id);
		var rect = cumulativeOffset(element);
		console.log(event.pageX+' '+event.pageY+' '+rect.left+' '+rect.top);
		displayID = id+"_popup";
		var myElem = document.getElementById(displayID);
		if(myElem!=null)
		document.body.removeChild(myElem);

		$("body").append(appendContentDictionary[id+"_popup"]);
		document.getElementById(id+"_popup").style.left = (rect.left-100)+'px';
		document.getElementById(id+"_popup").style.top = (rect.top+30)+'px';

	});


	$('.fypSpecialClass').mouseover(function(){
		$(this).css("color","#FF9900");
		$(this).css("cursor","pointer");
	});
	$('.fypSpecialClass').mouseout(function(){
		$(this).css("color","black");
	});
    }




    window.addEventListener("load", function(){
	    vocabularyListDisplayed = 0;
	    chrome.storage.sync.get(null, function(result){

		var allKeys = Object.keys(result);
		console.log(allKeys);

		userAccount = result.userAccount;
		isWorking = result.isWorking;
		wordDisplay = result.wordDisplay;
		wordsReplaced = result.wordsReplaced;
		websiteSetting = result.websiteSetting;

		console.log("user acc: "+ result.userAccount);
		console.log("user isWorking: "+ result.isWorking);
		console.log("user wordDisplay: "+ result.wordDisplay);
		console.log("user wordsReplaced: "+ result.wordsReplaced);
		console.log("user websiteSetting: "+ result.websiteSetting);

		if (userAccount == undefined){
		var d = new Date();
		userAccount = "id"+d.getTime()+"_1";
		chrome.storage.sync.set({'userAccount': userAccount});
		}

		if(isWorking == undefined)
		{
		    isWorking = 0;
		    chrome.storage.sync.set({'isWorking': isWorking});
		}

		if(wordDisplay == undefined){
		    wordDisplay = 0;
		    chrome.storage.sync.set({'wordDisplay': wordDisplay});
		}

		if(wordsReplaced == undefined){
		    wordsReplaced = 2;
		    console.log("Setting words to replace to : " + wordsReplaced + " (default setting)");
		    chrome.storage.sync.set({'wordsReplaced': wordsReplaced});
		}

		if(websiteSetting == undefined){
		    websiteSetting = "cnn.com";
		    console.log("Setting websites to use to : " + websiteSetting + " (default setting)");
		    chrome.storage.sync.set({'websiteSetting': websiteSetting});
		}

		var remembered = new HttpClient();

		var websiteCheck = 0;
		var splitedWebsite = websiteSetting.split("_");

		for(var k = 0; k < splitedWebsite.length; k++){
		    if(document.URL.indexOf(splitedWebsite[k]) !== -1 && websiteSetting !== "")
			websiteCheck = 1;
		} 

		if(websiteSetting.indexOf('all')!==-1)
		    websiteCheck = 1;
		console.log("isWorking "+isWorking + " websiteCheck "+websiteCheck);
		if(isWorking == 1 && websiteCheck == 1)
		{

		    var paragraphs = document.getElementsByTagName('p');

		    for (var i = 0; i < paragraphs.length; i++) {

			var sourceWords = [];
			var targetWords = [];

			var stringToServer = paragraphs[i];
			stringToServer = stringToServer.innerText;

			var url = url_front+'show';
			var params = "text="+encodeURIComponent(stringToServer) + "&url=" + encodeURIComponent(document.URL) + "&name=" + userAccount;

			talkToHeroku(url, params, i);
		    }


		}

	    });
    });


    var HttpClient = function() {
	this.get = function(aUrl, aCallback) {
	    anHttpRequest = new XMLHttpRequest();
	    anHttpRequest.onreadystatechange = function() { 
		if (anHttpRequest.readyState == 4 && anHttpRequest.status == 200)
		    aCallback(anHttpRequest.responseText);
	    }
	    anHttpRequest.open( "GET", aUrl, true );            
	    anHttpRequest.send( null );
	}	
	this.post = function(url, callback) {
	    httpRequest = new XMLHttpRequest(); 
	    httpRequest.onreadystatechange = function() { 
		if (httpRequest.readyState == 4 && httpRequest.status == 200)
		    callback(anHttpRequest.responseText);
	    }
	    httpRequest.open( "POST", url, true );            
	    httpRequest.send( null );

	}
    }

    function shuffle(o){ //v1.0
	for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
	return o;
    };

    function occurrences(string, substring) {
	var n = 0;
	var pos = 0;
	var l = substring.length;

	while (true) {
	    pos = string.indexOf(substring, pos);
	    if (pos > -1) {
		n++;
		pos += l;
	    } else {
		break;
	    }
	}
	return (n);
    }
