import "dotenv/config";
const AV_USERNAME = process.env.AV_USERNAME;
const AV_PASSWORD = process.env.AV_PASSWORD;

export default function basicAuthMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Basic ")) {
        res.setHeader("WWW-Authenticate", 'Basic realm="Protected Area"');
        return res.status(401).send("Unauthorized: No credentials provided");
    }

    const credentials = Buffer.from(authHeader.split(" ")[1], "base64")
        .toString()
        .split(":");
    const user = credentials[0];
    const pass = credentials[1];

    if (user !== AV_USERNAME || pass !== AV_PASSWORD) {
        res.setHeader("WWW-Authenticate", 'Basic realm="Protected Area"');
        console.log(`❌ Incorrect credentials: ${user}`);
        return res.status(401).send("Unauthorized: Incorrect user");
    }

    next(); // Continue to next middleware
}

