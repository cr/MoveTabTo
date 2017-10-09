"use strict";

function onResponse(response) {
    console.log("Response: ", response);
}

function onError(error) {
    console.log("Error: ", error);
}

function windowTitleClickHandler(event) {
    event.preventDefault();
    document.execCommand('selectAll',false,null)
}

function getWindowTitle(windowId) {
    const storedName = localStorage.getItem(windowId);
    console.log(`Stored name for window ${windowId} is "${storedName}"`);
    if ((storedName === null) || (storedName.length === 0)) {
        return `Window-${windowId}`;
    }
    return storedName;
}

function runtimeMessageHandler(message) {
    console.log("Received message:", message);
    switch (message.action) {
        case "rename_window":
            updateWindowTitle(message.windowId, message.newName);
    }
}

function updateWindowTitle(windowId) {
    const newTitle = getWindowTitle(windowId);  // Method prevents empty titles.
    const windowElement = document.getElementById(`window-item_${windowId}`);
    windowElement.childNodes[0].firstChild.textContent = newTitle;
}

function sendTitleUpdate(event) {
    const windowId = parseInt(event.target.parentNode.parentNode.id.split("_")[1]);
    let newName = event.target.textContent;
    localStorage.setItem(windowId, newName);
    console.log(`Renaming window ${windowId} to "${newName}"`);
    browser.runtime.sendMessage({action: "rename_window", windowId: windowId});
    updateWindowTitle(windowId);  // For updating this WM. It doesn't seem to get the message.
}


function WindowManager(rootNodeId) {
    this.root = document.querySelector(rootNodeId);
    if (this.root === null) {
        console.error(`No root node "#${rootNodeId}" in sidebar`);
        return;
    }
    console.debug("Attaching WindowManager to root node", this.root)
}
WindowManager.prototype.teardown = function WM_teardown() {
    while (this.root.hasChildNodes())
        this.root.removeChild(this.root.lastChild);
};
WindowManager.prototype.setup = function WM_setup() {
    this.teardown();
    const getting = browser.windows.getAll({
        populate: true,
        windowTypes: ["normal"]
    });
    return getting.then(this.addWindows.bind(this), onError);
};
WindowManager.prototype.addWindows = function WM_addWindows(windowInfoArray) {
    for (const windowInfo of windowInfoArray) {
        this.addWindow(windowInfo);
    }
};
WindowManager.prototype.addWindow = function WM_addWindow(windowInfo) {
    // console.log(`Window: ${windowInfo.id}`);
    // console.log(windowInfo.tabs.map((tab) => {return tab.url}));

    const details = document.createElement("details");
    details.id = `window-item_${windowInfo.id}`;
    details.className = "window_div";

    const summary = document.createElement("summary");
    summary.className = "window_title";

    const windowTitle = document.createElement("div");
    windowTitle.className = "window_title_div";
    windowTitle.textContent = getWindowTitle(windowInfo.id);
    windowTitle.contentEditable = true;
    windowTitle.addEventListener("click", windowTitleClickHandler);
    windowTitle.addEventListener("blur", sendTitleUpdate);

    summary.appendChild(windowTitle);

    const tabListDiv = document.createElement("div");
    tabListDiv.className = "tab_list_div";

    for (const tab of windowInfo.tabs) {

        const tabDiv = document.createElement("div");
        tabDiv.id = `tab-item_${tab.id}`;
        tabDiv.className = "tab_div";

        const tabIcon = document.createElement("img");
        tabIcon.className = "tab_icon";
        // tabIcon.width = 16;
        // tabIcon.height = 16;
        tabIcon.src = tab.favIconUrl;
        // console.log("TAB OBJECT: ", tab);
        tabDiv.appendChild(tabIcon);

        const tabTitleDiv = document.createElement("div");
        tabTitleDiv.className = "tab_title";
        tabTitleDiv.textContent = tab.title;

        tabDiv.appendChild(tabTitleDiv);
        tabListDiv.appendChild(tabDiv);
    }

    details.appendChild(summary);
    details.appendChild(tabListDiv);
    this.root.appendChild(details);
};
WindowManager.prototype.windowCreatedHandler = function WM_windowCreateHandler(createdWindow) {
    browser.windows.get(createdWindow.id, {
        populate: true,
        windowTypes: ["normal"]
    }).then((windowInfo) => {
        console.log("Adding window:", windowInfo);
        this.addWindow(windowInfo);
    });
};
WindowManager.prototype.windowRemovedHandler = function WM_windowRemovedHandler(removedWindowId) {
    console.log("WM removing window:", removedWindowId);
    const removedElement = document.getElementById(`window-item_${removedWindowId}`);
    if (removedElement !== null) {
        removedElement.remove();
    }
};
WindowManager.prototype.tabCreatedHandler = function WM_tabCreatedHandler(tab) {
    console.log("WM tab created:", tab);
    this.teardown();
    this.setup();  // FIXME: This is insanely wasteful. Implement selective updating of tabs.
};
WindowManager.prototype.tabRemovedHandler = function WM_tabRemovedHandler(tabId, removeInfo) {
    console.log("WM tab removed:", tabId, removeInfo);
    this.teardown();
    this.setup();  // FIXME: This is insanely wasteful. Implement selective updating of tabs.
};
WindowManager.prototype.tabMovedHandler = function WM_tabMovedHandler(tabId, moveInfo) {
    console.log("WM tab moved:", tabId, moveInfo);
    this.teardown();
    this.setup();  // FIXME: This is insanely wasteful. Implement selective updating of tabs.
};
WindowManager.prototype.tabAttachedHandler = function WM_tabAttachedHandler(tabId, attachInfo) {
    console.log("WM tab attached:", tabId, attachInfo);
    this.teardown();
    this.setup();  // FIXME: This is insanely wasteful. Implement selective updating of tabs.
};
WindowManager.prototype.tabDetachedHandler = function WM_tabDetachedHandler(tabId, detachInfo) {
    console.log("WM tab detached:", tabId, detachInfo);
    this.teardown();
    this.setup();  // FIXME: This is insanely wasteful. Implement selective updating of tabs.
};
WindowManager.prototype.tabUpdatedHandler = function WM_tabUpdatedHandler(tabId, changeInfo, tab) {
    console.log("WM tab updated:", tabId, changeInfo, tab);
};

const wm = new WindowManager("#window-list");
wm.setup();

browser.windows.onCreated.addListener(wm.windowCreatedHandler.bind(wm));
browser.windows.onRemoved.addListener(wm.windowRemovedHandler.bind(wm));

browser.tabs.onCreated.addListener(wm.tabCreatedHandler.bind(wm));
browser.tabs.onRemoved.addListener(wm.tabRemovedHandler.bind(wm));
browser.tabs.onMoved.addListener(wm.tabMovedHandler.bind(wm));
browser.tabs.onAttached.addListener(wm.tabAttachedHandler.bind(wm));
browser.tabs.onDetached.addListener(wm.tabDetachedHandler.bind(wm));
browser.tabs.onUpdated.addListener(wm.tabUpdatedHandler.bind(wm));

browser.runtime.onMessage.addListener(runtimeMessageHandler);
