/**
 * CI environment detection utilities
 */

export function isCI(): boolean {
    return (
        process.env.CI === "true" ||
        process.env.GITHUB_ACTIONS === "true" ||
        process.env.GITLAB_CI === "true" ||
        process.env.JENKINS_URL !== undefined ||
        process.env.CIRCLECI === "true" ||
        process.env.BUILDKITE === "true"
    );
}

export function getCIEnvironment(): string | null {
    if (process.env.GITHUB_ACTIONS === "true") return "github-actions";
    if (process.env.GITLAB_CI === "true") return "gitlab-ci";
    if (process.env.JENKINS_URL !== undefined) return "jenkins";
    if (process.env.CIRCLECI === "true") return "circleci";
    if (process.env.BUILDKITE === "true") return "buildkite";
    if (process.env.CI === "true") return "unknown-ci";
    return null;
}

export function getGitSha(): string | null {
    // GitHub Actions
    if (process.env.GITHUB_SHA) {
        return process.env.GITHUB_SHA.substring(0, 7);
    }
    // GitLab CI
    if (process.env.CI_COMMIT_SHA) {
        return process.env.CI_COMMIT_SHA.substring(0, 7);
    }
    // CircleCI
    if (process.env.CIRCLE_SHA1) {
        return process.env.CIRCLE_SHA1.substring(0, 7);
    }
    return null;
}

export function getBranch(): string | null {
    // GitHub Actions
    if (process.env.GITHUB_REF_NAME) {
        return process.env.GITHUB_REF_NAME;
    }
    // GitLab CI
    if (process.env.CI_COMMIT_REF_NAME) {
        return process.env.CI_COMMIT_REF_NAME;
    }
    // CircleCI
    if (process.env.CIRCLE_BRANCH) {
        return process.env.CIRCLE_BRANCH;
    }
    return null;
}
