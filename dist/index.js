/******/ /* webpack/runtime/compat */
/******/ 
/******/ if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = new URL('.', import.meta.url).pathname.slice(import.meta.url.match(/^file:\/\/\/\w:/) ? 1 : 0, -1) + "/";
/******/ 
/************************************************************************/
var __webpack_exports__ = {};

var __createBinding = (undefined && undefined.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (undefined && undefined.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (undefined && undefined.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github_1 = require("@actions/github");
function run() {
    var _a, _b, _c, _d, _e;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Create GitHub client with the API token.
            const token = core.getInput("token", { required: true });
            const octokit = (0, github_1.getOctokit)(token);
            // Debug log the payload.
            core.debug(`Payload keys: ${Object.keys(github_1.context.payload)}`);
            // Get event name.
            const eventName = github_1.context.eventName;
            // Define the base and head commits to be extracted from the payload.
            let base;
            let head;
            switch (eventName) {
                case "pull_request":
                    base = (_b = (_a = github_1.context.payload.pull_request) === null || _a === void 0 ? void 0 : _a.base) === null || _b === void 0 ? void 0 : _b.sha;
                    head = (_d = (_c = github_1.context.payload.pull_request) === null || _c === void 0 ? void 0 : _c.head) === null || _d === void 0 ? void 0 : _d.sha;
                    break;
                case "push":
                    base = github_1.context.payload.before;
                    head = github_1.context.payload.after;
                    break;
                default:
                    core.setFailed(`This action only supports pull requests and pushes, ${github_1.context.eventName} events are not supported. ` +
                        "Please submit an issue on this action's GitHub repo if you believe this in correct.");
            }
            // Log the base and head commits
            core.info(`Base commit: ${base}`);
            core.info(`Head commit: ${head}`);
            // Ensure that the base and head properties are set on the payload.
            if (!base || !head) {
                core.setFailed(`The base and head commits are missing from the payload for this ${github_1.context.eventName} event. ` +
                    "Please submit an issue on this action's GitHub repo.");
                // To satisfy TypeScript, even though this is unreachable.
                base = "";
                head = "";
            }
            // Use GitHub's compare two commits API.
            // https://developer.github.com/v3/repos/commits/#compare-two-commits
            const response = yield octokit.rest.repos.compareCommits({
                base,
                head,
                owner: github_1.context.repo.owner,
                repo: github_1.context.repo.repo,
            });
            // Ensure that the request was successful.
            if (response.status !== 200) {
                core.setFailed(`The GitHub API for comparing the base and head commits for this ${github_1.context.eventName} event returned ${response.status}, expected 200. ` +
                    "Please submit an issue on this action's GitHub repo.");
            }
            // Ensure that the head commit is ahead of the base commit.
            if (response.data.status !== "ahead") {
                core.setFailed(`The head commit for this ${github_1.context.eventName} event is not ahead of the base commit. ` +
                    "Please submit an issue on this action's GitHub repo.");
            }
            // Get the changed files from the response payload.
            const files = response.data.files;
            const all = [];
            for (const file of files) {
                const filename = file.filename;
                all.push(filename);
            }
            core.setOutput("all", all);
        }
        catch (error) {
            core.setFailed(`${(_e = error === null || error === void 0 ? void 0 : error.message) !== null && _e !== void 0 ? _e : error}`);
        }
    });
}
run();

