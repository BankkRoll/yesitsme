/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_providers_instagram from "../actions/providers/instagram.js";
import type * as actions_providers_instagramApi from "../actions/providers/instagramApi.js";
import type * as actions_providers_profileScraper from "../actions/providers/profileScraper.js";
import type * as actions_providers_searchEngines from "../actions/providers/searchEngines.js";
import type * as actions_providers_types from "../actions/providers/types.js";
import type * as actions_providers_utils from "../actions/providers/utils.js";
import type * as actions_runLookup from "../actions/runLookup.js";
import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as jobs from "../jobs.js";
import type * as lib_crypto from "../lib/crypto.js";
import type * as lib_scoring from "../lib/scoring.js";
import type * as settings from "../settings.js";
import type * as settingsNode from "../settingsNode.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/providers/instagram": typeof actions_providers_instagram;
  "actions/providers/instagramApi": typeof actions_providers_instagramApi;
  "actions/providers/profileScraper": typeof actions_providers_profileScraper;
  "actions/providers/searchEngines": typeof actions_providers_searchEngines;
  "actions/providers/types": typeof actions_providers_types;
  "actions/providers/utils": typeof actions_providers_utils;
  "actions/runLookup": typeof actions_runLookup;
  auth: typeof auth;
  http: typeof http;
  jobs: typeof jobs;
  "lib/crypto": typeof lib_crypto;
  "lib/scoring": typeof lib_scoring;
  settings: typeof settings;
  settingsNode: typeof settingsNode;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
