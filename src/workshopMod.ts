import path from "path";
import fs from "fs";
import stripJsonComments from "strip-json-comments";
import PathHelper from "./pathHelper";
import WorkshopModManager from "./workshopModManager";

export interface Shape {
    type: "block" | "part" | "joint";
    uuid: string;
    modLocalId: string;
    definition: Object;
}

export interface Description {
    creatorId?: number;
    description: string;
    fileId?: number | undefined;
    localId: string;
    name: string;
    type: "Blocks and Parts" | string,
    version: number;

    [key: string]: any;
}

export class WorkshopMod {
    dir: string;
    description: Description;
    isFake: boolean;
    shapes: {
        [uuid: string]: Shape;
    }
    preview: string;

    constructor(dir: string, description: Description, isFake: boolean = false, preview?: string) {
        this.dir = dir;
        this.description = description || JSON.parse(stripJsonComments(fs.readFileSync(path.join(this.dir, "description.json")).toString()));
        this.isFake = isFake;
        this.preview = preview
            ?? ["png", "jpg", "gif"].find(ext => fs.existsSync(path.join(this.dir, `preview.${ext}`)))
            ?? PathHelper.expandPathPlaceholders("$GAME_DATA/ExampleMods/Blocks and Parts/preview.jpg");
        this.shapes = {};

        if (this.description.type !== "Blocks and Parts") throw new Error(`This is not a mod! type = ${this.description.type}`);
    }

    parseShapesets(shapesetsDir?: string): number {
        shapesetsDir ??= path.join(this.dir, "Objects", "Database", "ShapeSets");

        if (!fs.existsSync(shapesetsDir)) throw new Error(`ShapeSets directory doesn't exist! (${shapesetsDir})`);

        for (let shapesetFile of fs.readdirSync(shapesetsDir)) {
            let currentFile = path.join(shapesetsDir, shapesetFile);
            if (fs.statSync(currentFile).isDirectory()) { // Include recursive directories
                this.parseShapesets(currentFile);
                continue;
            } else if(path.extname(currentFile) !== ".json") continue; // Only try to parse json files

            let shapesetJson;
            try {
                shapesetJson = JSON.parse(stripJsonComments(fs.readFileSync(currentFile).toString()));
            } catch(ex) {
                console.error(`Failed parsing shapesets file "${currentFile}"`);
                throw ex;
            }

            if (shapesetJson.blockList) {
                for (let shape of shapesetJson.blockList) {
                    this.shapes[shape.uuid] = {
                        type: "block",
                        uuid: shape.uuid,
                        modLocalId: this.description.localId,
                        definition: shape
                    }
                }
            }

            if (shapesetJson.partList) {
                for (let shape of shapesetJson.partList) {
                    this.shapes[shape.uuid] = {
                        type: "part",
                        uuid: shape.uuid,
                        modLocalId: this.description.localId,
                        definition: shape
                    }
                }
            }
        }

        return Object.keys(this.shapes).length;
    }

    expandPathPlaceholders(p: string): string {
        p = p.replace("$MOD_DATA", this.dir);

        return WorkshopModManager.expandPathPlaceholders(p);
    }

}
