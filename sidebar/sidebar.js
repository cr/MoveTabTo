"use strict";


class WindowItem {

    static async createElement(windowId, createTabs = true) {
        const windowInfo = await browser.windows.get(windowId, {
            populate: true,
            windowTypes: ["normal"]
        });
        return WindowItem.createElementFromWindowInfo(windowInfo, createTabs);
    }

    static createElementFromWindowInfo(windowInfo, createTabs = true) {

        const details = document.createElement("details");
        details.id = `window-item_${windowInfo.id}`;
        details.className = "window_div";

        const summary = document.createElement("summary");
        summary.className = "window_title";

        const windowTitle = document.createElement("div");
        windowTitle.className = "window_title_div";
        windowTitle.textContent = WindowItem.getWindowTitle(windowInfo.id);
        windowTitle.contentEditable = true;
        windowTitle.spellcheck = false;
        windowTitle.addEventListener("click", WindowItem.windowTitleClickHandler);
        windowTitle.addEventListener("blur", WindowItem.windowTitleUpdateHandler);

        summary.appendChild(windowTitle);

        const tabListDiv = document.createElement("div");
        tabListDiv.id = `tab-list_${windowInfo.id}`;
        tabListDiv.className = "tab_list_div";

        if (createTabs) {
            for (const tabInfo of windowInfo.tabs) {
                const tabDiv = TabItem.createElementFromTabInfo(tabInfo);
                tabListDiv.appendChild(tabDiv);
            }
        }

        details.appendChild(summary);
        details.appendChild(tabListDiv);

        return details;
    }

    static getElementById(tabId) {
        return document.getElementById(`window-item_${tabId}`);
    }

    static getParentWindowElement(element) {
        let parent = element;
        while (!parent.id.startsWith("window-item_")) {
            parent = parent.parentElement;
            if (parent === null)
                return null;
        }
        return parent;
    }

    static getWindowIdFromChildElement(element) {
        const parent = WindowItem.getParentWindowElement(element);
        if (parent === null) {
            return null;
        } else {
            return parseInt(parent.id.split("_")[1]);
        }
    }

    static updateWindowTitle(windowId) {
        const newTitle = WindowItem.getWindowTitle(windowId);  // Method prevents empty titles.
        const windowElement = WindowItem.getElementById(windowId);
        windowElement.firstChild.firstChild.textContent = newTitle;
    }

    static getWindowTitle(windowId) {
        const storedName = localStorage.getItem(windowId);
        // console.log(`Stored name for window ${windowId} is "${storedName}"`);
        if ((storedName === null) || (storedName.length === 0)) {
            return `Window-${windowId}`;
        }
        return storedName;
    }

    static windowTitleClickHandler(event) {
        event.preventDefault();
        document.execCommand("selectAll", false, null);
    }

    static windowTitleUpdateHandler(event) {
        const windowId = WindowItem.getWindowIdFromChildElement(event.target);
        let newName = event.target.textContent;
        localStorage.setItem(windowId, newName);
        console.log(`Renaming window ${windowId} to "${newName}"`);
        browser.runtime.sendMessage({action: "rename_window", windowId: windowId});
        WindowItem.updateWindowTitle(windowId);  // For updating this sidebar. It doesn't seem to get the message.
    }

    static tabCreatedHandler(tabInfo) {
        console.log("WM tab created:", tabInfo);
        const newTab = TabItem.createElementFromTabInfo(tabInfo);
        const targetWindow = WindowItem.getElementById(tabInfo.windowId);
        const tabList = targetWindow.lastChild;
        const referenceNode = tabList.childNodes[tabInfo.index];
        if (typeof referenceNode !== "undefined") {
            tabList.insertBefore(newTab, referenceNode);
        } else {
            tabList.insertBefore(newTab, null);  // at the end
        }
    }

    static tabRemovedHandler(tabId, removeInfo) {
        console.log("WM tab removed:", tabId, removeInfo);
        TabItem.getElementById(tabId).remove();
    }

    static tabAttachedHandler(tabId, attachInfo) {
        console.log("WM tab attached:", tabId, attachInfo);
        browser.tabs.get(tabId).then(WindowItem.tabCreatedHandler);
    }

    static tabDetachedHandler(tabId, detachInfo) {
        console.log("WM tab detached:", tabId, detachInfo);
        TabItem.getElementById(tabId).remove();
    }

    static tabMovedHandler(tabId, moveInfo) {
        console.log("WM tab moved:", tabId, moveInfo);
        const targetWindow = WindowItem.getElementById(moveInfo.windowId);
        const tabList = targetWindow.lastChild;
        const referenceNode = tabList.childNodes[moveInfo.toIndex];
        const movedTab = TabItem.getElementById(tabId);
        movedTab.remove();
        if (typeof referenceNode !== "undefined") {
            tabList.insertBefore(movedTab, referenceNode);
        } else {
            tabList.insertBefore(movedTab, null);  // at the end
        }
    }

    static addListeners() {
        if (!browser.tabs.onCreated.hasListener(WindowItem.tabCreatedHandler))
            browser.tabs.onCreated.addListener(WindowItem.tabCreatedHandler);
        if (!browser.tabs.onRemoved.hasListener(WindowItem.tabRemovedHandler))
            browser.tabs.onRemoved.addListener(WindowItem.tabRemovedHandler);
        if (!browser.tabs.onAttached.hasListener(WindowItem.tabAttachedHandler))
            browser.tabs.onAttached.addListener(WindowItem.tabAttachedHandler);
        if (!browser.tabs.onDetached.hasListener(WindowItem.tabDetachedHandler))
            browser.tabs.onDetached.addListener(WindowItem.tabDetachedHandler);
        if (!browser.tabs.onMoved.hasListener(WindowItem.tabMovedHandler))
            browser.tabs.onMoved.addListener(WindowItem.tabMovedHandler);
    }
}


class TabItem {

    static async createElement(tabId) {
        const tabInfo = await browser.tabs.get(tabId);
        return TabItem.createElementFromTabInfo(tabInfo);
    }

    static createElementFromTabInfo(tabInfo) {

        const tabDiv = document.createElement("div");
        tabDiv.id = `tab-item_${tabInfo.id}`;
        tabDiv.className = "tab_div";
        tabDiv.addEventListener("click", TabItem.focusHandler);
        tabDiv.addEventListener("dblclick", TabItem.closeHandler);

        const tabIcon = document.createElement("img");
        tabIcon.className = "tab_icon";
        // tabIcon.width = 16;
        // tabIcon.height = 16;
        tabIcon.src = tabInfo.favIconUrl;
        // console.log("TAB OBJECT: ", tab);
        tabDiv.appendChild(tabIcon);

        const tabTitleDiv = document.createElement("div");
        tabTitleDiv.className = "tab_title";
        tabTitleDiv.textContent = tabInfo.title;

        tabDiv.appendChild(tabTitleDiv);

        return tabDiv;
    }

    static getElementById(tabId) {
        return document.getElementById(`tab-item_${tabId}`);
    }

    static getParentTabElement(element) {
        let parent = element;
        while (!parent.id.startsWith("tab-item_")) {
            parent = parent.parentElement;
            if (parent === null)
                return null;
        }
        return parent;
    }

    static getTabIdFromElement(element) {
        const parent = TabItem.getParentTabElement(element);
        if (parent === null) {
            return null;
        } else {
            return parseInt(parent.id.split("_")[1]);
        }
    }

    static closeHandler(event) {
        const tabId = TabItem.getTabIdFromElement(event.target);
        browser.tabs.remove(tabId);
        // Event will propagate to Window objects through tabClosed events.
    }

    static focusHandler(event) {
        const tabId = TabItem.getTabIdFromElement(event.target);
        browser.tabs.get(tabId).then((tab) => {
            browser.tabs.update(tab.id, {active: true}).then((tab) => {
                browser.windows.update(tab.windowId, {focused: true});
            });
        });
    }

    static tabUpdatedHandler(tabId, changeInfo, tab) {
        console.log("WM tab updated:", tabId, changeInfo, tab);
        if (changeInfo.hasOwnProperty("favIconUrl")) {
            const tabElement = TabItem.getElementById(tabId);
            if (tabElement !== null)
                tabElement.firstChild.src = changeInfo.favIconUrl
        }
        if (changeInfo.hasOwnProperty("title")) {
            const tabElement = TabItem.getElementById(tabId);
            if (tabElement !== null)
                tabElement.lastChild.textContent = changeInfo.title
        }
    }

    static addListeners() {
        if (!browser.tabs.onUpdated.hasListener(TabItem.tabUpdatedHandler))
            browser.tabs.onUpdated.addListener(TabItem.tabUpdatedHandler);
    }
}

class WindowManager {

    constructor(rootNodeId) {
        this.root = document.querySelector(rootNodeId);
        if (this.root === null) {
            console.error(`No root node "#${rootNodeId}" in sidebar`);
            return;
        }
        console.debug("Attaching WindowManager to root node", this.root)
    }

    teardown() {
        while (this.root.hasChildNodes())
            this.root.removeChild(this.root.lastChild);
    }

    setup() {
        this.teardown();
        const getting = browser.windows.getAll({
            populate: true,
            windowTypes: ["normal"]
        });
        return getting.then(this.addWindows.bind(this)).then(this.addListeners.bind(this));
    }

    addWindows(windowInfoArray) {
        for (const windowInfo of windowInfoArray) {
            this.addWindow(windowInfo);
        }
    }

    addWindow(windowInfo) {
        if (WindowItem.getElementById(windowInfo.id)) {
            console.warn("Window already has an element:", windowInfo)
        } else {
            this.root.appendChild(WindowItem.createElementFromWindowInfo(windowInfo, true));
        }
    }

    windowCreatedHandler(createdWindow) {
        browser.windows.get(createdWindow.id, {
            populate: true,
            windowTypes: ["normal"]
        }).then((windowInfo) => {
            console.log("Adding window:", windowInfo);
            this.addWindow(windowInfo);
        });
    }

    static windowRemovedHandler(removedWindowId) {
        console.log("WM removing window:", removedWindowId);
        const removedElement = WindowItem.getElementById(removedWindowId);
        if (removedElement !== null) {
            removedElement.remove();
        }
    }

    static runtimeMessageHandler(message) {
        console.log("Received message:", message);
        switch (message.action) {
            case "rename_window":
                WindowItem.updateWindowTitle(message.windowId);
        }
    }

    addListeners() {
        browser.windows.onCreated.addListener(this.windowCreatedHandler.bind(wm));
        browser.windows.onRemoved.addListener(WindowManager.windowRemovedHandler);
        browser.runtime.onMessage.addListener(WindowManager.runtimeMessageHandler);
    }
}


const wm = new WindowManager("#window-list");
wm.setup();

WindowItem.addListeners();
TabItem.addListeners();
