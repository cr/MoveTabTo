"use strict";

function windowObjectToName(windowInfo) {
    return "Window-" + windowInfo.id;
}

function windowNameToObject(windowName) {
    if (windowName.startsWith("Window-")) {
        const windowId = parseInt(windowName.split("-")[1]);
        return browser.windows.get(windowId);
    }
    return null;
}

function updateWindowList() {

    const listDiv = document.querySelector("#window-list");
    if (listDiv === null) {
        console.error("No window-list element in sidebar");
        return;
    }

    while (listDiv.hasChildNodes())
        listDiv.removeChild(listDiv.lastChild);

    function addToWindowList(windowInfoArray) {
        for (const windowInfo of windowInfoArray) {
            console.log(`Window: ${windowInfo.id}`);
            console.log(windowInfo.tabs.map((tab) => {return tab.url}));
            const details = document.createElement("details");
            details.id = `window-item_${windowInfo.id}`;
            const summary = document.createElement("summary");
            summary.textContent = windowObjectToName(windowInfo);
            const tabListDiv = document.createElement("div");
            tabListDiv.className = "tab_list_div";
            for (const tab of windowInfo.tabs) {
                const tabDiv = document.createElement("div");
                tabDiv.className = "tab_div";
                // const tabIconDiv = document.createElement("link");
                // tabIconDiv.type = "image/x-icon";
                // tabIconDiv.rel = "shortcut icon";
                // tabIconDiv.href = tab.favIconUrl;
                // const tabIconDiv = document.createElement("div");
                // tabIconDiv.style.backgroundImage = tab.favIconUrl;
                const tabIconDiv = document.createElement("img");
                tabIconDiv.className = "tab_icon";
                tabIconDiv.width = 16;
                tabIconDiv.height = 16;
                tabIconDiv.src = tab.favIconUrl;
                tabDiv.appendChild(tabIconDiv);
                const tabTitleDiv = document.createElement("div");
                tabTitleDiv.className = "tab_title";
                tabTitleDiv.textContent = tab.title;
                tabDiv.appendChild(tabTitleDiv);
                tabListDiv.appendChild(tabDiv)
            }
            details.appendChild(summary);
            details.appendChild(tabListDiv);
            listDiv.appendChild(details);
        }
    }

    function onError(error) {
        console.log(`Error: ${error}`);
    }

    const getting = browser.windows.getAll({
        populate: true,
        windowTypes: ["normal"]
    });
    getting.then(addToWindowList, onError);
}

browser.windows.onCreated.addListener(updateWindowList);
browser.windows.onRemoved.addListener(updateWindowList);
updateWindowList();
