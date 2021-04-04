import { Dialog } from "electron";
import regedit from "regedit";
import path from "path";
import fs from "fs";

const NO_INSTALL_DIR_MESSAGE = "PathHelper.INSTALLATION_DIR not initialised. Initialise it using PathHelper.findSMInstallDir() or PathHelper.findOrSelectSMInstallDir().";
const NO_USER_DIR_MESSAGE = "PathHelper.USER_DIR not initialised. Initialise it using PathHelper.findUserDir()";

export default class PathHelper {
    static STEAM_DIR: string | undefined;
    static WORKSHOP_DIR: string | undefined;
    static INSTALLATION_DIR: string | undefined;

    static GAME_DATA: string | undefined;
    static SURVIVAL_DATA: string | undefined;
    static CHALLENGE_DATA: string | undefined;

    static USER_DIR: string | undefined;
    static USER_BLUEPRINTS_DIR: string | undefined;
    static USER_CHALLENGES_DIR: string | undefined;
    static USER_MODS_DIR: string | undefined;
    static USER_PROGRESS_DIR: string | undefined;
    static USER_SAVE_DIR: string | undefined;
    static USER_TILES_DIR: string | undefined;
    static USER_WORLDS_DIR: string | undefined;


    
    static isValidSMInstallDir(dir: string): boolean {
        // console.log("Validating", dir);
        return fs.existsSync(path.join(dir, "Release", "ScrapMechanic.exe"));
    }

    static findSteamInstallation(): Promise<string> {
        return new Promise((resolve, reject) => {
            regedit.list("HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam", (err: Error, result: Object) => { //TODO: Test this on 32bit windows
                
                if (err !== null) {
                    console.error("Error getting the Steam install directory from the registry", err);
                    reject(err.message);
                    return;
                }

                this.STEAM_DIR = Object.values(result)[0].values.InstallPath.value;
                this.WORKSHOP_DIR = path.join(<string>this.STEAM_DIR, "steamapps", "workshop", "content", "387990");
                
                resolve(<string>this.STEAM_DIR);
            });
        });
    }

    static getSteamLibraryFolders(): string[] {
        let libFol = [ <string>this.STEAM_DIR ];

        let vdf = fs.readFileSync(path.join(<string>this.STEAM_DIR, "steamapps", "libraryfolders.vdf")).toString();
        let matches = Array.from(vdf.matchAll(/^\t"\d+"\t\t"(.*?)"$/gm));

        // console.log(Array.from(matches));
        for (let m of matches) libFol.push(m[1].replace("\\\\", path.sep));

        return libFol;
    }

    static async findSMInstallDir(): Promise<string | undefined> {
        await this.findSteamInstallation();
        // console.log(this);

        for (let lf of this.getSteamLibraryFolders()) {
            let inst = path.join(lf, "steamapps", "common", "Scrap Mechanic");

            if (this.isValidSMInstallDir(inst)) {
                this.INSTALLATION_DIR = inst;
                break;
            }
        }
        // console.log(this);

        return this.INSTALLATION_DIR;
    }

    static async selectSMInstallDir(): Promise<boolean> {
        // Check if the Electron module is present
        let dialog: Electron.Dialog;
        try {
            require.resolve("electron");
            dialog = require("electron").dialog;
        } catch(e) {
            throw "Unable to select Scrap Mechanic installation directory: Module \"electron\" not found!";
        }

        while (true) {
            try {
                let result = await dialog.showMessageBox(<Electron.BrowserWindow> <unknown>undefined, {
                    message: "Unable to find the Scrap Mechanic installation. Do you want to select the installation directory manually?",
                    buttons: ["Cancel", "Yes"],
                    defaultId: 1,
                    title: "Error",
                    type: "error"
                })

                let inst;
            
                if (result.response === 1) { // Yes
                    let selectedDirs = dialog.showOpenDialogSync(<Electron.BrowserWindow> <unknown>undefined, {
                        defaultPath: this.STEAM_DIR,
                        title: "Select Scrap Mechanic installation directory",
                        properties: ["openDirectory"]
                    });

                    if (selectedDirs === undefined) return false // Selection canceled
                    inst = selectedDirs[0]; // Returns an array with one element
                } else { // Did not want to select manually
                    return false;
                }
                
                // Validate if the found or selected directory contains the /Release/ScrapMechanic.exe
                if (this.isValidSMInstallDir(inst)) {
                    this.INSTALLATION_DIR = inst;
                    return true;
                } else {
                    // The directory was not valid
                    continue;
                }

            } catch(err) {
                console.error("Failed selecting installation directory", err);
                await dialog.showErrorBox("Failed selecting installation directory", err);

                // Stopping the application
                return false;
            }
        }
    }

    static async findOrSelectSMInstallDir(): Promise<boolean | string> {

        try {
            await this.findSMInstallDir();
        } catch (err) {
            console.log("Failed to find Scrap Mechanic installation directory:", err);
            return this.selectSMInstallDir();
        }

        // Continuing the launch
        return true;
    }

    static findUserDir(): string | undefined {
        let base = path.join(process.env.APPDATA ?? "AppdataNotFound", "Axolot Games", "Scrap Mechanic", "User");

        this.USER_DIR = fs.readdirSync(base) // Get all files and directories
            .filter(dir => dir.match(/^User_\d+$/g)) // Check if it matches a Steam id
            .map(dir => path.join(base, dir)) // Combine the base and directory name
            .filter(dir => fs.lstatSync(dir).isDirectory()) // Check if it's a directory
            .sort((a, b) => fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime()) // Sort by modified date (high to low)
            [0]; // Return the first
        
        // Set the other user directories
        if (this.USER_DIR) {
            for (let name of ["Blueprints", "Challenges", "Mods", "Progress", "Save", "Tiles", "Worlds"]){
                let dir = path.join(this.USER_DIR, name);
                if (fs.existsSync(dir)) {
                    this[`USER_${name.toUpperCase()}_DIR`] = dir;
                }
            }
        }

        return this.USER_DIR;
    }

    // For when used in Electron (see https://github.com/ironSource/node-regedit#a-note-about-electron)
    static setExternalVBSLocation(path: string): void {
        regedit.setExternalVBSLocation(path);
    }



    static updatePaths(): void {
        if (!this.INSTALLATION_DIR) throw NO_INSTALL_DIR_MESSAGE;

        this.GAME_DATA = path.join(<string>this.INSTALLATION_DIR, "Data");
        this.SURVIVAL_DATA = path.join(<string>this.INSTALLATION_DIR, "Survival");
        this.CHALLENGE_DATA = path.join(<string>this.INSTALLATION_DIR, "ChallengeData");
    }

    static expandPathPlaceholders(p: string): string {
        if (!this.INSTALLATION_DIR) throw NO_INSTALL_DIR_MESSAGE;

        return p.replace("$GAME_DATA", <string>this.GAME_DATA)
                .replace("$SURVIVAL_DATA", <string>this.SURVIVAL_DATA)
                .replace("$CHALLENGE_DATA", <string>this.CHALLENGE_DATA);
    }
}
