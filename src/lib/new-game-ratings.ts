import "server-only";

// The app keeps server-only enforcement; the isolated Node CLI imports the
// exact same implementation from game-ratings-provider.node.ts.
export { collectNewGameRatings } from "./game-ratings-provider.node";
