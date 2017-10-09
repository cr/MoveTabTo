"use strict";

function getWindowTitle(windowId) {
    const storedName = localStorage.getItem(windowId);
    console.log(`Stored name for window ${windowId} is "${storedName}"`);
    if ((storedName === null) || (storedName.length === 0)) {
        return `Window-${windowId}`;
    }
    return storedName;
}

/*
Called when the item has been created, or when creation failed due to an error.
We'll just log success/failure here.
*/
function onCreated() {
    if (browser.runtime.lastError) {
        console.log(`Error: ${browser.runtime.lastError}`);
    } else {
        console.log("Item created successfully");
    }
}

/*
Called when the item has been removed.
We'll just log success here.
*/
function onRemoved() {
    console.log("Item removed successfully");
}

/*
Called when there was an error.
We'll just log the error here.
*/
function onError(error) {
    console.log(`Error: ${error}`);
}

/*
Create all the context menu items.
*/
function updateMenu() {
    browser.menus.removeAll();

    function addWindowsToMenu(windowInfoArray) {
        for (const windowInfo of windowInfoArray) {
            console.log(`Adding window to menu: ${windowInfo.id}`);
            //console.log(windowInfo.tabs.map((tab) => {return tab.url}));
            browser.menus.create({
                id: `move-to_${windowInfo.id}`,
                title: `... to "${getWindowTitle(windowInfo.id)}"`,
                contexts: ["tab", "all"]
            }, onCreated);
        }
        return windowInfoArray;
    }

    function addWindowFocusToMenu(windowInfoArray) {
        browser.menus.create({
            id: "separator-focus",
            type: "separator",
            contexts: ["tab", "all"]
        }, onCreated);
        for (const windowInfo of windowInfoArray) {
            console.log(`Adding window focus to menu: ${windowInfo.id}`);
            browser.menus.create({
                id: `focus-on_${windowInfo.id}`,
                title: `Go to "${getWindowTitle(windowInfo.id)}"`,
                contexts: ["tab", "all"]
            }, onCreated);
        }
    }

    function addSidebarToMenu() {
        browser.menus.create({
            id: "separator-sidebar",
            type: "separator",
            contexts: ["tab", "all"]
        }, onCreated);
        browser.menus.create({
            id: "open-sidebar",
            title: browser.i18n.getMessage("menuItemOpenSidebar"),
            contexts: ["tab", "all"],
            command: "_execute_sidebar_action"
        }, onCreated);
    }

    function onError(error) {
        console.log(`Error: ${error}`);
    }

    const getting = browser.windows.getAll({
        populate: true,
        windowTypes: ["normal"]
    });
    getting.then(addWindowsToMenu, onError)
        .then(addWindowFocusToMenu, onError)
        .then(addSidebarToMenu, onError);
}

/*
The click event listener, where we perform the appropriate action given the
ID of the menu item that was clicked.
*/
browser.menus.onClicked.addListener((info, tab) => {

    function onMoved(tab) {
        console.log("Moved tab: ", tab);
    }

    function onActive(tab) {
        console.log("Activated tab: ", tab);
    }

    function onFocused(window) {
        console.log("Focused on window: ", window);
    }

    function onError(error) {
        console.log(`Error moving tab: ${error}`);
    }

    if (info.menuItemId === "open-sidebar") {

        console.log("Opening Window Manager sidebar");

    } else if (info.menuItemId.startsWith("move-to_")) {

        const windowId = parseInt(info.menuItemId.split("_")[1]);
        const windowObject = browser.windows.get(windowId);
        console.log("Moving tab to window ", tab, windowObject);
        browser.tabs.move(tab.id, {windowId: windowId, index: -1}).then(onMoved, onError);
        browser.tabs.update(tab.id, {active: true}).then(onActive, onError);

    } else if (info.menuItemId.startsWith("focus-on_")) {

        const windowId = parseInt(info.menuItemId.split("_")[1]);
        console.log("Focusing on window ", windowId);
        browser.windows.update(windowId, {focused: true}).then(onFocused, onError);

    } else {
        console.warn("Dropping unhandled menu onClicked event: ", info);
    }
});

browser.windows.onCreated.addListener(updateMenu);  // It is inefficient to rebuild the whole menu
browser.windows.onRemoved.addListener(updateMenu);  // It is inefficient to rebuild the whole menu

function runtimeMessageHandler(message) {
    console.log("Received message:", message);
    switch (message.action) {
        case "rename_window":
            // updateWindowTitle(message.windowId, message.newName);
            updateMenu();  // Isn't this inefficient?
    }
}

browser.runtime.onMessage.addListener(runtimeMessageHandler);

updateMenu();
