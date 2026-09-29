/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as adminGuards from "../adminGuards.js";
import type * as auth from "../auth.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as booking from "../booking.js";
import type * as community from "../community.js";
import type * as http from "../http.js";
import type * as library from "../library.js";
import type * as membership from "../membership.js";
import type * as messaging from "../messaging.js";
import type * as paymentStore from "../paymentStore.js";
import type * as payments from "../payments.js";
import type * as programs from "../programs.js";
import type * as roles from "../roles.js";
import type * as store from "../store.js";
import type * as teaching from "../teaching.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminGuards: typeof adminGuards;
  auth: typeof auth;
  "auth/emailOtp": typeof auth_emailOtp;
  booking: typeof booking;
  community: typeof community;
  http: typeof http;
  library: typeof library;
  membership: typeof membership;
  messaging: typeof messaging;
  paymentStore: typeof paymentStore;
  payments: typeof payments;
  programs: typeof programs;
  roles: typeof roles;
  store: typeof store;
  teaching: typeof teaching;
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
