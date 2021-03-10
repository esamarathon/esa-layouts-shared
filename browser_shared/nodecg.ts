/**
 * Because of the context, this must be imported to access the NodeCG browser context with typings.
 */

import { NodeCGBrowser, NodeCGStaticBrowser } from 'nodecg/types/browser';

export const { nodecg, NodeCG }: { nodecg: NodeCGBrowser; NodeCG: NodeCGStaticBrowser } = window;
