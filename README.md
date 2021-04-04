# scrap-mechanic-common
Things commonly used when working with Scrap Mechanic

## PathHelper ##
Handles finding the game installation and user directories

```javascript
const { PathHelper } = require("scrap-mechanic-common");

// Locate the User_012345678 directory in %appdata%
PathHelper.findUserDir();

(async () => {
    
    if (await PathHelper.findSMInstallDir()) {
        // Found the game installation directory
        
        // Update GAME_DATA, SURVIVAL_DATA and CHALLENGE_DATA from PathHelper
        // to use the new PathHelper.INSTALLATION_DIR value
        PathHelper.updatePaths();
        
        // Expands $GAME_DATA, $SURVIVAL_DATA and $CHALLENGE_DATA to their full locations
        let texture = "$GAME_DATA/Objects/Textures/Blocks/blk_woodplanks01_dif.tga";
        console.log("Wood texture location:", PathHelper.expandPathPlaceholders(texture));
    } else {
        // Unable to locate the game installation directory
    }
    
})();
```

#### With Electron ####
If the game was unable to be found the user is able to select the correct installation directory themselves.
```javascript
const { app  } = require("electron");
const { PathHelper } = require("scrap-mechanic-common");

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on("ready", async (event, launchInfo) => {

    // First tries to find it automatically. If it fails, opens a dialog
    // and lets the user select it manually
    if (await PathHelper.findOrSelectSMInstallDir()) {
        // User has selected a valid Scrap Mechanic installation directory
    
        // Update GAME_DATA, SURVIVAL_DATA and CHALLENGE_DATA from PathHelper
        // to use the new PathHelper.INSTALLATION_DIR value
        PathHelper.updatePaths();
    
        // Locate the User_012345678 directory in %appdata%
        PathHelper.findUserDir();
        
        // Continue the app
        createWindow();
    } else {
        // User canceled the selection
        
        app.quit();
    }
});
```

## WorkshopModManager ##
Handles installed workshop mods.

```javascript
const { PathHelper, WorkshopModManager } = require("scrap-mechanic-common");

(async () => {
    // Find PathHelper.USER_MODS_DIR
    PathHelper.findUserDir();
    
    // Find PathHelper.WORKSHOP_DIR
    if (await PathHelper.findSMInstallDir())
        PathHelper.updatePaths();

    // Loads all mods found in WorkshopModManager.getModsDirectories() and parses the shapesets
    let { modCount, shapeCount } = WorkshopModManager.reloadMods(true /* parse shapesets */);
    console.log(`Loaded ${modCount} mods with ${shapeCount} shapes`);
    
    // All loaded mods, including fake mods for Creative, Survival and Challenge mode
    console.log("The mod is called:", WorkshopModManager.mods["26ef623b-97d2-49ba-9a10-8898c1a94e9a"].name);
    
    // Gets the mods that have a shape with the uuid of Wood Block 1
    WorkshopModManager.getModsWithShapeUuid("df953d9c-234f-4ac2-af5e-f0490b223e71")
    
    // Expands $CONTENT_${mod.localId} to the full path
    let preview = "$CONTENT_26ef623b-97d2-49ba-9a10-8898c1a94e9a/preview.jpg";
    console.log("The The Modpack mod preview image can be found in:", WorkshopModManager.expandPathPlaceholders(preview));
    
})();
```
