// ==UserScript==
// @name         MangaDex++
// @namespace    https://github.com/MangaDexPP/userscript
// @version      1.0.3
// @description  QOL stuff for MD
// @match        https://mangadex.org/*
// @match        http://mangadex.org/*
// @icon         https://icons.duckduckgo.com/ip2/www.mangadex.org.ico
// @grant        none
// ==/UserScript==

//------------------------------------------------//
//------------------CONFIGURABLE------------------//
//------------------------------------------------//

//-------------------UNIVERSAL--------------------//
const POLLING_TIME          = 100;
const API_REQUEST_INTERVAL  = 1000;

//--------------------TRACKER---------------------//
const READ_BUTTON_COLOR     = "#13ab493d";
const IGNORE_BUTTON_COLOR   = "#ab13133d";
const UNMARKED_BUTTON_COLOR = "#4242cd3d";
const HIDE_ALL_READ_BUTTON_COLOR = "#ff80003d";

//-----------------HIDE ALL READ------------------//
const DOES_HIDE_ALL_READ = true;

//------------------BLOCK USERS-------------------//
const USER_LIST = [];
const GROUP_LIST = [];
const TAG_LIST = ["boys' love"]; // IMPORTANT: Use all lowercase

//------------------------------------------------//
//------------------DO NOT TOUCH------------------//
//--------------MANGA TRACKER CONSTS--------------//
//------------------------------------------------//
var hideRead = false;
var hideIgnore = true;
var hideUnmarked = false;
var hideAllRead = true;
var forceRecheckNewEntry = false;
var queue = [];

const CATEGORY_FEED     = "/titles/feed";
const CATEGORY_FOLLOWS  = "/titles/follows";
const CATEGORY_HISTORY  = "/my/history";
const CATEGORY_ALL      = "/titles";
const CATEGORY_RECENT   = "/titles/recent";
const CATEGORY_LATEST   = "/titles/latest";
const CATEGORY_AUTHOR   = "/author/";
const CATEGORY_GROUP    = "/group/";
const CATEGORY_TITLE    = "/title/";
const CATEGORY_TAGS     = "/tag/";

const FORMAT_NOT_FOUND  = 0;
const FORMAT_LIST       = 1;
const FORMAT_THUMBNAIL  = 2;
const FORMAT_DETAIL     = 3;

function getFormat(pathname) {
    if (pathname.startsWith(CATEGORY_TITLE)) {
        return FORMAT_DETAIL;
    }
    if (pathname.startsWith(CATEGORY_GROUP)) {
        return FORMAT_LIST;
    }
    if (pathname.startsWith(CATEGORY_AUTHOR)) {
        return FORMAT_THUMBNAIL;
    }
    if (pathname.startsWith(CATEGORY_TAGS)) {
        return FORMAT_THUMBNAIL;
    }
    switch (pathname) {
        case CATEGORY_FEED:
            return FORMAT_LIST;
        case CATEGORY_FOLLOWS:
            return FORMAT_THUMBNAIL;
        case CATEGORY_HISTORY:
            return FORMAT_LIST;
        case CATEGORY_ALL:
            return FORMAT_THUMBNAIL;
        case CATEGORY_RECENT:
            return FORMAT_THUMBNAIL;
        case CATEGORY_LATEST:
            return FORMAT_LIST;
        case CATEGORY_TITLE:
            return FORMAT_DETAIL;
        case CATEGORY_GROUP:
            return FORMAT_LIST;
        case CATEGORY_AUTHOR:
            return FORMAT_THUMBNAIL;
        default:
            return FORMAT_NOT_FOUND;
    }
}


(function() {
    "use strict";
    main();
    handle_queue();
})();

function main() {
    var lastTagList = window.localStorage.getItem("_conf_tags");
    var currentTagList = TAG_LIST.toLocaleString();
    if (lastTagList != currentTagList) {
        forceRecheckNewEntry = true;
        window.localStorage.setItem("_conf_tags", currentTagList);
    }
    handleBaseUrl(window.location.href);
    setTimeout(main, POLLING_TIME);
}

function handleBaseUrl(baseUrl) {
    var url = new URL(baseUrl);
    var format = getFormat(url.pathname);

    blockUsers(format);
    if (format === FORMAT_NOT_FOUND) {
        return;
    }

    if (format === FORMAT_LIST && DOES_HIDE_ALL_READ) {
        hideAllReadFunc();
    }

    addControllers();
    addButtons(format);
    categorize(format, url.pathname.startsWith(CATEGORY_LATEST));
}

//------------------------------------------------//
//-----------------HIDE ALL READ------------------//
//------------------------------------------------//
function hideAllReadFunc() {
    var allAllRead = true;
    var entries = document.querySelectorAll(".chapter-feed__container");
    for (var i = 0; i < entries.length; i++) {
        // If not using hideAllRead option, remove the flag and let the tracker handle it
        var entry = entries[i];
        if (!hideAllRead) {
            entry.attributes["hidden-override"] = undefined;
            continue;
        }

        // hideAllRead will take priority over tracker
        var allRead = true;
        var chapters = entry.querySelectorAll(".chapter .readMarker");
        for (var j = 0; j < chapters.length; j++) {
            allRead = allRead && !chapters[j].classList.contains("feather-eye");
        }
        if (allRead) {
            toggleVisibility(entry, false);
            entry.attributes["hidden-override"] = true;
        }
    }
}


//------------------------------------------------//
//--------------------TRACKER---------------------//
//------------------------------------------------//
function addButtonsForElement(entryID, element, format) {
    if (format === FORMAT_LIST) {
        var title = element.querySelector(".chapter-feed__title");
        title.outerHTML = "<div>" + title.outerHTML + "</div>";
        title = element.querySelector(".chapter-feed__title");
        title.parentElement.innerHTML = title.parentElement.innerHTML;
        title = element.querySelector(".chapter-feed__title");
        title.style.setProperty("display", "flex");
        title.style.setProperty("justify-content", "space-between");
    } else if (format === FORMAT_THUMBNAIL) {
        var title = element.querySelector(".title");
    }

    var alignment = format === FORMAT_DETAIL ? "left" : "right";
    var padding = format === FORMAT_DETAIL ? "10px 0px 0px 0px" : "0px 10px 0px 10px";

    var html = `
        <div style="height: 100%; float:` + alignment + `"; class="inline-block">
            <div style="padding: ` + padding + `; display: flex; justify-content: space-between;">
                    <input class="databtn1" entryid="` + entryID +
        `" type="button" value="Read" style="
                        background-color: transparent;
                        padding: 0 1em;
                        box-shadow: inset 0 0 3px 1px #ddd;
                        -moz-box-shadow: inset 0 0 3px 1px #ddd;
                        -webkit-box-shadow: inset 0 0 3px 1px #ddd;
                        -ms-box-shadow: inset 0 0 3px 1px #ddd;
                        -o-box-shadow: inset 0 0 3px 1px #ddd;
                        border-radius: 4px;
                        ">
                <input class="databtn2" entryid="` + entryID +
        `" type="button" value="Ignore" style="
                        background-color: transparent;
                        padding: 0 1em;
                        box-shadow: inset 0 0 3px 1px #ddd;
                        border-radius: 4px;
                        ">
                <input class="databtn3" entryid="` + entryID +
        `" type="button" value="Clear" style="
                        background-color: transparent;
                        padding: 0 1em;
                        box-shadow: inset 0 0 3px 1px #ddd;
                        border-radius: 4px;
                ">
            </div>
        </div>`;

    if (format === FORMAT_LIST) {
        var url = title.href;
        title.removeAttribute("href");
        title.innerHTML =
            `<a href="` + url + `">` + title.innerHTML + "</a>" + html;
        title
            .querySelector(".databtn1")
            .addEventListener("click", queueEntry, false);
        title
            .querySelector(".databtn2")
            .addEventListener("click", ignoreEntry, false);
        title
            .querySelector(".databtn3")
            .addEventListener("click", clearEntry, false);
        var titleText = title.querySelector("a");
        titleText.style.setProperty("overflow", "hidden");
        titleText.style.setProperty("white-space", "nowrap");
        titleText.style.setProperty("text-overflow", "ellipsis");
    } else if (format === FORMAT_THUMBNAIL) {
        var status = title.parentNode.querySelector(".status");
        status.innerHTML += html;
        status
            .querySelector(".databtn1")
            .addEventListener("click", queueEntry, false);
        status
            .querySelector(".databtn2")
            .addEventListener("click", ignoreEntry, false);
        status
            .querySelector(".databtn3")
            .addEventListener("click", clearEntry, false);
    } else if (format === FORMAT_DETAIL) {
        var inner = document.createElement("div");
        inner.innerHTML = html;
        element.appendChild(inner);
        element
            .querySelector(".databtn1")
            .addEventListener("click", queueEntry, false);
        element
            .querySelector(".databtn2")
            .addEventListener("click", ignoreEntry, false);
        element
            .querySelector(".databtn3")
            .addEventListener("click", clearEntry, false);
    }
}

function addControllers() {
    var ele = document.querySelector(".controls");
    if (ele === null || ele.querySelector("input") !== null) {
        return;
    }
    var button1 = document.createElement("input");
    button1.setAttribute("id", "toggleQueue");
    button1.setAttribute("type", "button");
    button1.setAttribute("value", "Toggle Read");
    button1.style.setProperty("background-color", hideRead ? READ_BUTTON_COLOR : "transparent");
    button1.style.setProperty("padding", "0 1em");
    button1.style.setProperty("box-shadow", "inset 0 0 3px 1px #ddd");
    button1.style.setProperty("border-radius", "4px");
    var button2 = document.createElement("input");
    button2.setAttribute("id", "toggleIgnore");
    button2.setAttribute("type", "button");
    button2.setAttribute("value", "Toggle Ignore");
    button2.style.setProperty("background-color", hideIgnore ? IGNORE_BUTTON_COLOR : "transparent");
    button2.style.setProperty("padding", "0 1em");
    button2.style.setProperty("box-shadow", "inset 0 0 3px 1px #ddd");
    button2.style.setProperty("border-radius", "4px");
    var button3 = document.createElement("input");
    button3.setAttribute("id", "toggleUnmarked");
    button3.setAttribute("type", "button");
    button3.setAttribute("value", "Toggle Unmarked");
    button3.style.setProperty("background-color", hideUnmarked ? UNMARKED_BUTTON_COLOR : "transparent");
    button3.style.setProperty("padding", "0 1em");
    button3.style.setProperty("box-shadow", "inset 0 0 3px 1px #ddd");
    button3.style.setProperty("border-radius", "4px");
    var button4 = document.createElement("input");
    button4.setAttribute("id", "toggleHideAllRead");
    button4.setAttribute("type", "button");
    button4.setAttribute("value", "Hide All Read?");
    button4.style.setProperty("background-color", hideAllRead ? HIDE_ALL_READ_BUTTON_COLOR : "transparent");
    button4.style.setProperty("padding", "0 1em");
    button4.style.setProperty("box-shadow", "inset 0 0 3px 1px #ddd");
    button4.style.setProperty("border-radius", "4px");

    button1.onclick = function() {
        hideRead = !hideRead;
        console.log("Toggled read flag hidden to " + hideRead);
        if (hideRead) {
            ele.querySelector("#toggleQueue").style.setProperty(
                "background-color",
                READ_BUTTON_COLOR
            );
        } else {
            ele.querySelector("#toggleQueue").style.setProperty(
                "background-color",
                "transparent"
            );
        }
    };
    button2.onclick = function() {
        hideIgnore = !hideIgnore;
        console.log("Toggled ignore flag hidden to " + hideIgnore);
        if (hideIgnore) {
            ele.querySelector("#toggleIgnore").style.setProperty(
                "background-color",
                IGNORE_BUTTON_COLOR
            );
        } else {
            ele.querySelector("#toggleIgnore").style.setProperty(
                "background-color",
                "transparent"
            );
        }
    };
    button3.onclick = function() {
        hideUnmarked = !hideUnmarked;
        console.log("Toggled unmarked flag hidden to " + hideUnmarked);
        if (hideUnmarked) {
            ele.querySelector("#toggleUnmarked").style.setProperty(
                "background-color",
                UNMARKED_BUTTON_COLOR
            );
        } else {
            ele.querySelector("#toggleUnmarked").style.setProperty(
                "background-color",
                "transparent"
            );
        }
    };
    button4.onclick = function() {
        hideAllRead = !hideAllRead;
        console.log("Toggled hide all read to " + hideAllRead);
        if (hideAllRead) {
            ele.querySelector("#toggleHideAllRead").style.setProperty(
                "background-color",
                HIDE_ALL_READ_BUTTON_COLOR
            );
        } else {
            ele.querySelector("#toggleHideAllRead").style.setProperty(
                "background-color",
                "transparent"
            );
        }
    };

    ele.appendChild(button1);
    ele.appendChild(button2);
    ele.appendChild(button3);
    if (DOES_HIDE_ALL_READ) {
        ele.appendChild(button4);
    }
}

function addButtons(format) {
    switch (format) {
        case FORMAT_LIST:
            addButtonsForListFormat();
            break;
        case FORMAT_THUMBNAIL:
            addButtonsForThumnailFormat();
            break;
        case FORMAT_DETAIL:
            addButtonsForDetailFormat();
            break;
    }
}

function addButtonsForListFormat() {
    var entries = document.querySelectorAll(".chapter-feed__container");
    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (entry.querySelector("input") === null) {
            var url = entry.querySelector(".chapter-feed__title").href;
            var entryID = url.split("/");
            entryID = entryID[entryID.length - 2];
            addButtonsForElement(entryID, entry, FORMAT_LIST);
        }
    }
}

function addButtonsForThumnailFormat() {
    var entries = document.querySelectorAll(".manga-card");
    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (entry.querySelector("input") === null) {
            var url = entry.querySelector(".title").href;
            var entryID = url.split("/");
            entryID = entryID[entryID.length - 2];
            addButtonsForElement(entryID, entry, FORMAT_THUMBNAIL);
        }
    }
}

function addButtonsForDetailFormat() {
    var entry = document.querySelector(".layout-container > div:nth-child(6)");
    if (entry === null) {
        return;
    }
    try {
        var entryID = window.location.href.split("/")[4];
    } catch (te) {
        return;
    }
    if (entry.querySelector(".databtn1") !== null) {
        return;
    }
    addButtonsForElement(entryID, entry, FORMAT_DETAIL);
}

function categorize(format, isLatestPage) {
    if (format === FORMAT_NOT_FOUND) {
        return;
    }
    var selector = ".layout-container > div:nth-child(6)";
    switch (format) {
        case FORMAT_LIST:
            selector = ".chapter-feed__container";
            break;
        case FORMAT_THUMBNAIL:
            selector = ".manga-card";
            break;
    }
    var entries = document.querySelectorAll(selector);

    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        var button1 = entry.querySelector(".databtn1");
        var button2 = entry.querySelector(".databtn2");
        if (button1 !== null && button2 !== null) {
            var entryID = button1.getAttribute("entryid");
            var displayElement = null;
            switch (format) {
                case FORMAT_LIST:
                    displayElement = entry;
                    break;
                case FORMAT_THUMBNAIL:
                    displayElement = entry;
                    break;
            }

            var flag = window.localStorage.getItem(entryID);
            if (flag === "-1") {
                button1.style.setProperty(
                    "background-color",
                    "transparent"
                );
                button2.style.setProperty("background-color", IGNORE_BUTTON_COLOR);
                toggleVisibility(displayElement, !hideIgnore);
            } else if (flag === "1") {
                button1.style.setProperty("background-color", READ_BUTTON_COLOR);
                button2.style.setProperty(
                    "background-color",
                    "transparent"
                );
                toggleVisibility(displayElement, !hideRead);
            } else {
                button1.style.setProperty(
                    "background-color",
                    "transparent"
                );
                button2.style.setProperty(
                    "background-color",
                    "transparent"
                );
                toggleVisibility(displayElement, !hideUnmarked);
                // Check all new entries and ignore if blacklisted tag
                if (isLatestPage && (flag === null || forceRecheckNewEntry) && !queue.includes(entryID)) {
                    queue.push(entryID);
                }
            }
        }
    }
}

function toggleVisibility(displayElement, on) {
    if (displayElement === null || displayElement.attributes["hidden-override"] !== undefined) {
        return;
    }
    if (on) {
        displayElement.style.removeProperty("display");
    } else {
        displayElement.style.setProperty("display", "none");
    }
}

function queueEntry(event) {
    var entryID = event.currentTarget.attributes["entryid"].value;
    console.log("Queue " + entryID);
    window.localStorage.setItem(entryID, 1);
}

function ignoreEntry(event) {
    var entryID = event.currentTarget.attributes["entryid"].value;
    console.log("Ignore " + entryID);
    window.localStorage.setItem(entryID, -1);
}

function clearEntry(event) {
    var entryID = event.currentTarget.attributes["entryid"].value;
    console.log("Clear " + entryID);
    if (window.localStorage.getItem(entryID) !== null) {
        window.localStorage.removeItem(entryID);
    }
}

function handle_queue() {
    if (queue.length > 0) {
        var entryID = queue.shift();
        console.debug("Popped ID " + entryID);
        checkPage(entryID);
    }
    setTimeout(handle_queue, API_REQUEST_INTERVAL);
}

function checkPage(entryID) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "https://api.mangadex.org/manga/" + entryID, true);
    xhr.onload = function () {
    if (xhr.status >= 200 && xhr.status < 300) {
        var metadata = JSON.parse(xhr.responseText);
        parseAndHandleEntry(entryID, metadata);
    } else {
        console.error('Failed to fetch entry ' + entryID + ' with status ' + xhr.status);
    }
  };
  xhr.onerror = function () {
      console.error('Failed to fetch entry ' + entryID);
  };
  xhr.send();
}

function parseAndHandleEntry(entryID, metadata) {
    if (metadata["result"] != "ok") {
        console.error('Failed to fetch entry ' + entryID);
        return;
    }
    var tags = metadata["data"]["attributes"]["tags"];
    for (var i = 0; i < tags.length; i++) {
        var tag = tags[i]["attributes"]["name"]["en"].toLowerCase();
        // Blacklisted tag
        if (TAG_LIST.includes(tag)) {
            console.log("Ignore " + entryID + " due to blacklisted tag: " + tag);
            window.localStorage.setItem(entryID, -1);
            return;
        }
    }
    // Checked, but do nothing about it
    window.localStorage.setItem(entryID, -2);
}

//------------------------------------------------//
//------------------BLOCK USERS-------------------//
//------------------------------------------------//
function blockUsers(format) {
    if (format == FORMAT_LIST) {
        // Completely remove chapter listing if all blocked
        var chapters = document.querySelectorAll(".chapter-feed__container");
        var toRemove = [];
        for (var i = 0; i < chapters.length; i++) {
            if (chapters[i].querySelectorAll(".chapter-grid.flex-grow").length == 0) {
                toRemove.push(chapters[i]);
            }
        }
        for (var i = 0; i < toRemove.length; i++) {
            document.querySelector(".page-container > div:nth-child(2)").removeChild(toRemove[i]);
        }
    }

    // Should work for both chapter listing in feeds and in manga page
    var chapterRows = document.querySelectorAll(".chapter-grid.flex-grow");
    for (var i = 0; i < chapterRows.length; i++) {
        var uploader = row.querySelector("a.line-clamp-1");
        if ((uploader != null && USER_LIST.includes(uploader.innerText)) || GROUP_LIST.includes(row.querySelector(".group-tag").innerText)) {
            row.parentNode.parentNode.removeChild(row.parentNode);
        }
    }
}
