background.js
-----------------
This javascript is loaded and initalized when chrome is opened. 

The main event system is written here (chrome.runtime.onMessage.addListener). 
It will recieves messages from both popup.js and background.js to trigger 
different events such as
- tab active
- change mode
- update tab
- new page
- change translation
- update score and rank
- change quiz
- send facebook recommend
- update website setting

eventLogger.js
---------------
This javascript file contains a simple event logger system. It has function prototypes
that can be called from learn, annotate, content-share.js.
1) Call createEventLog function to create an event logger
2) If needed call addDetail function to add more information
3) Call newEvent function to register new event
4) Call getEventLog function when you want to retrieve the event log


The three files learn.js, annotate.js and content-share.js are only loaded(inserted) and 
initalized when user click on wordnews logo.

learn.js
-----------
This javascript file contains functions to generate the popup box for both 
translated/quiz in the front-end. The functions will be called from 
content-share.js when it recieved a response from the server.

annotate.js
-------------
This javascript file contains functions to generate annotation in the front-end.
The functions will be called from content-share.js when it recieved a response 
from the server.

content-share.js
-------------------
content-share.js has same scope as learn.js and annotation.js, in another words,
all three files can access each other the global variables. Some examples are 
learnLanguage, annotationLanguage and etc etc. 

In here, there is message listener(chrome.runtime.onMessage.addListener) to listen from 
background.js to change the mode of word news. There are three modes (disable, annotate and learn).
The message will determine what are the variables should be set for the mode.

There is an window event ( $(window).on("blur focus", function(e) )to check 
whether window is focused or blur.

There are also common functions which are used for both learn.js and annotate.js.
- checkRankAndLogin
- updateScoreAndRank
- getURLPostfix
- getParagraphs
- sendLog









