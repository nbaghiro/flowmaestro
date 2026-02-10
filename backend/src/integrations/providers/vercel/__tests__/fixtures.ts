/**
 * Vercel Provider Test Fixtures
 *
 * Based on official Vercel API documentation:
 * - Deployments: https://vercel.com/docs/rest-api/endpoints/deployments
 * - Projects: https://vercel.com/docs/rest-api/endpoints/projects
 * - Domains: https://vercel.com/docs/rest-api/endpoints/domains
 * - Environment Variables: https://vercel.com/docs/rest-api/endpoints/environment-variables
 */

import type { TestFixture } from "../../../sandbox";

/**
 * Sample projects for test data
 */
const sampleProjects = [
    {
        id: "prj_2WjyKQmM8ZnGcJsPWMrHRHrE",
        name: "flowmaestro-frontend",
        framework: "nextjs",
        createdAt: 1703289600000,
        updatedAt: 1703376000000,
        link: {
            type: "github",
            repo: "flowmaestro-frontend",
            org: "flowmaestro"
        }
    },
    {
        id: "prj_3XkzLRnN9AoHdKtQXNsSIJfF",
        name: "flowmaestro-docs",
        framework: "nextjs",
        createdAt: 1702684800000,
        updatedAt: 1703203200000,
        link: {
            type: "github",
            repo: "flowmaestro-docs",
            org: "flowmaestro"
        }
    }
];

export const vercelFixtures: TestFixture[] = [
    {
        operationId: "createDeployment",
        provider: "vercel",
        validCases: [
            {
                name: "create_production_deployment",
                description: "Create a new production deployment from a git source",
                input: {
                    name: "flowmaestro-frontend",
                    target: "production",
                    gitSource: {
                        type: "github",
                        ref: "main",
                        repoId: "123456789"
                    }
                },
                expectedOutput: {
                    deployment: {
                        uid: "dpl_89ABCdEfGhI2J3KLmNoP4qRs",
                        name: "flowmaestro-frontend",
                        url: "flowmaestro-frontend-8dabcdefg.vercel.app",
                        state: "BUILDING",
                        target: "production",
                        created: 1703376000000,
                        creator: {
                            uid: "usr_1234567890abcdef",
                            email: "developer@flowmaestro.com",
                            username: "flowmaestro-dev"
                        },
                        inspectorUrl:
                            "https://vercel.com/flowmaestro/flowmaestro-frontend/dpl_89ABCdEfGhI2J3KLmNoP4qRs"
                    },
                    message: "Deployment dpl_89ABCdEfGhI2J3KLmNoP4qRs created successfully"
                }
            },
            {
                name: "create_staging_deployment",
                description: "Create a staging deployment from a feature branch",
                input: {
                    name: "flowmaestro-frontend",
                    target: "staging",
                    gitSource: {
                        type: "github",
                        ref: "feature/new-dashboard",
                        repoId: "123456789"
                    }
                },
                expectedOutput: {
                    deployment: {
                        uid: "dpl_56TUvWxYz7A8B9CdEfGh0iJk",
                        name: "flowmaestro-frontend",
                        url: "flowmaestro-frontend-feature-new-dashboard-56tuvwxyz.vercel.app",
                        state: "BUILDING",
                        target: "staging",
                        created: 1703379600000,
                        creator: {
                            uid: "usr_1234567890abcdef",
                            email: "developer@flowmaestro.com",
                            username: "flowmaestro-dev"
                        },
                        inspectorUrl:
                            "https://vercel.com/flowmaestro/flowmaestro-frontend/dpl_56TUvWxYz7A8B9CdEfGh0iJk"
                    },
                    message: "Deployment dpl_56TUvWxYz7A8B9CdEfGh0iJk created successfully"
                }
            },
            {
                name: "create_deployment_minimal",
                description: "Create a deployment with minimal parameters",
                input: {
                    name: "flowmaestro-docs"
                },
                expectedOutput: {
                    deployment: {
                        uid: "dpl_12LMnOpQr3S4T5UvWxYz6aBC",
                        name: "flowmaestro-docs",
                        url: "flowmaestro-docs-12lmnopqr.vercel.app",
                        state: "QUEUED",
                        created: 1703383200000,
                        creator: {
                            uid: "usr_1234567890abcdef",
                            email: "developer@flowmaestro.com",
                            username: "flowmaestro-dev"
                        },
                        inspectorUrl:
                            "https://vercel.com/flowmaestro/flowmaestro-docs/dpl_12LMnOpQr3S4T5UvWxYz6aBC"
                    },
                    message: "Deployment dpl_12LMnOpQr3S4T5UvWxYz6aBC created successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "project_not_found",
                description: "Project with given name does not exist",
                input: {
                    name: "nonexistent-project",
                    target: "production"
                },
                expectedError: {
                    type: "not_found",
                    message: "Project not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for deployment creation",
                input: {
                    name: "flowmaestro-frontend",
                    target: "production"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getDeployment",
        provider: "vercel",
        validCases: [
            {
                name: "get_completed_deployment",
                description: "Get details of a successfully completed deployment",
                input: {
                    deploymentId: "dpl_89ABCdEfGhI2J3KLmNoP4qRs"
                },
                expectedOutput: {
                    deployment: {
                        uid: "dpl_89ABCdEfGhI2J3KLmNoP4qRs",
                        name: "flowmaestro-frontend",
                        url: "flowmaestro-frontend-8dabcdefg.vercel.app",
                        state: "READY",
                        target: "production",
                        created: 1703376000000,
                        ready: 1703376180000,
                        creator: {
                            uid: "usr_1234567890abcdef",
                            email: "developer@flowmaestro.com",
                            username: "flowmaestro-dev"
                        },
                        inspectorUrl:
                            "https://vercel.com/flowmaestro/flowmaestro-frontend/dpl_89ABCdEfGhI2J3KLmNoP4qRs"
                    }
                }
            },
            {
                name: "get_building_deployment",
                description: "Get details of a deployment in progress",
                input: {
                    deploymentId: "dpl_56TUvWxYz7A8B9CdEfGh0iJk"
                },
                expectedOutput: {
                    deployment: {
                        uid: "dpl_56TUvWxYz7A8B9CdEfGh0iJk",
                        name: "flowmaestro-frontend",
                        url: "flowmaestro-frontend-feature-new-dashboard-56tuvwxyz.vercel.app",
                        state: "BUILDING",
                        target: "staging",
                        created: 1703379600000,
                        creator: {
                            uid: "usr_1234567890abcdef",
                            email: "developer@flowmaestro.com",
                            username: "flowmaestro-dev"
                        },
                        inspectorUrl:
                            "https://vercel.com/flowmaestro/flowmaestro-frontend/dpl_56TUvWxYz7A8B9CdEfGh0iJk"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "deployment_not_found",
                description: "Deployment ID does not exist",
                input: {
                    deploymentId: "dpl_NONEXISTENT12345"
                },
                expectedError: {
                    type: "not_found",
                    message: "Deployment not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    deploymentId: "dpl_89ABCdEfGhI2J3KLmNoP4qRs"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "cancelDeployment",
        provider: "vercel",
        validCases: [
            {
                name: "cancel_building_deployment",
                description: "Cancel a deployment that is currently building",
                input: {
                    deploymentId: "dpl_56TUvWxYz7A8B9CdEfGh0iJk"
                },
                expectedOutput: {
                    deployment: {
                        uid: "dpl_56TUvWxYz7A8B9CdEfGh0iJk",
                        name: "flowmaestro-frontend",
                        url: "flowmaestro-frontend-feature-new-dashboard-56tuvwxyz.vercel.app",
                        state: "CANCELED",
                        target: "staging",
                        created: 1703379600000,
                        creator: {
                            uid: "usr_1234567890abcdef",
                            email: "developer@flowmaestro.com",
                            username: "flowmaestro-dev"
                        },
                        inspectorUrl:
                            "https://vercel.com/flowmaestro/flowmaestro-frontend/dpl_56TUvWxYz7A8B9CdEfGh0iJk"
                    },
                    message: "Deployment dpl_56TUvWxYz7A8B9CdEfGh0iJk canceled successfully"
                }
            },
            {
                name: "cancel_queued_deployment",
                description: "Cancel a deployment that is queued",
                input: {
                    deploymentId: "dpl_12LMnOpQr3S4T5UvWxYz6aBC"
                },
                expectedOutput: {
                    deployment: {
                        uid: "dpl_12LMnOpQr3S4T5UvWxYz6aBC",
                        name: "flowmaestro-docs",
                        url: "flowmaestro-docs-12lmnopqr.vercel.app",
                        state: "CANCELED",
                        created: 1703383200000,
                        creator: {
                            uid: "usr_1234567890abcdef",
                            email: "developer@flowmaestro.com",
                            username: "flowmaestro-dev"
                        },
                        inspectorUrl:
                            "https://vercel.com/flowmaestro/flowmaestro-docs/dpl_12LMnOpQr3S4T5UvWxYz6aBC"
                    },
                    message: "Deployment dpl_12LMnOpQr3S4T5UvWxYz6aBC canceled successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "deployment_not_found",
                description: "Deployment to cancel does not exist",
                input: {
                    deploymentId: "dpl_NONEXISTENT12345"
                },
                expectedError: {
                    type: "not_found",
                    message: "Deployment not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    deploymentId: "dpl_56TUvWxYz7A8B9CdEfGh0iJk"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listDeployments",
        provider: "vercel",
        validCases: [
            {
                name: "list_all_deployments",
                description: "List all deployments for the account",
                input: {
                    limit: 10
                },
                expectedOutput: {
                    deployments: [
                        {
                            uid: "dpl_89ABCdEfGhI2J3KLmNoP4qRs",
                            name: "flowmaestro-frontend",
                            url: "flowmaestro-frontend-8dabcdefg.vercel.app",
                            state: "READY",
                            target: "production",
                            created: 1703376000000,
                            ready: 1703376180000,
                            creator: {
                                uid: "usr_1234567890abcdef",
                                email: "developer@flowmaestro.com",
                                username: "flowmaestro-dev"
                            },
                            inspectorUrl:
                                "https://vercel.com/flowmaestro/flowmaestro-frontend/dpl_89ABCdEfGhI2J3KLmNoP4qRs"
                        },
                        {
                            uid: "dpl_56TUvWxYz7A8B9CdEfGh0iJk",
                            name: "flowmaestro-frontend",
                            url: "flowmaestro-frontend-feature-new-dashboard-56tuvwxyz.vercel.app",
                            state: "READY",
                            target: "staging",
                            created: 1703379600000,
                            ready: 1703379750000,
                            creator: {
                                uid: "usr_1234567890abcdef",
                                email: "developer@flowmaestro.com",
                                username: "flowmaestro-dev"
                            },
                            inspectorUrl:
                                "https://vercel.com/flowmaestro/flowmaestro-frontend/dpl_56TUvWxYz7A8B9CdEfGh0iJk"
                        }
                    ],
                    count: 2
                }
            },
            {
                name: "list_project_deployments",
                description: "List deployments for a specific project",
                input: {
                    projectId: "prj_2WjyKQmM8ZnGcJsPWMrHRHrE",
                    limit: 5,
                    target: "production"
                },
                expectedOutput: {
                    deployments: [
                        {
                            uid: "dpl_89ABCdEfGhI2J3KLmNoP4qRs",
                            name: "flowmaestro-frontend",
                            url: "flowmaestro-frontend-8dabcdefg.vercel.app",
                            state: "READY",
                            target: "production",
                            created: 1703376000000,
                            ready: 1703376180000,
                            creator: {
                                uid: "usr_1234567890abcdef",
                                email: "developer@flowmaestro.com",
                                username: "flowmaestro-dev"
                            },
                            inspectorUrl:
                                "https://vercel.com/flowmaestro/flowmaestro-frontend/dpl_89ABCdEfGhI2J3KLmNoP4qRs"
                        }
                    ],
                    count: 1
                }
            }
        ],
        errorCases: [
            {
                name: "project_not_found",
                description: "Project ID does not exist",
                input: {
                    projectId: "prj_NONEXISTENT12345",
                    limit: 10
                },
                expectedError: {
                    type: "not_found",
                    message: "Project not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    limit: 10
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getProject",
        provider: "vercel",
        validCases: [
            {
                name: "get_project_by_id",
                description: "Get project details by project ID",
                input: {
                    projectId: "prj_2WjyKQmM8ZnGcJsPWMrHRHrE"
                },
                expectedOutput: {
                    project: sampleProjects[0]
                }
            },
            {
                name: "get_project_by_name",
                description: "Get project details by project name",
                input: {
                    projectId: "flowmaestro-frontend"
                },
                expectedOutput: {
                    project: sampleProjects[0]
                }
            }
        ],
        errorCases: [
            {
                name: "project_not_found",
                description: "Project does not exist",
                input: {
                    projectId: "nonexistent-project"
                },
                expectedError: {
                    type: "not_found",
                    message: "Project not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    projectId: "prj_2WjyKQmM8ZnGcJsPWMrHRHrE"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listProjects",
        provider: "vercel",
        validCases: [
            {
                name: "list_all_projects",
                description: "List all projects for the authenticated user/team",
                input: {
                    limit: 20
                },
                expectedOutput: {
                    projects: sampleProjects,
                    count: 2
                }
            },
            {
                name: "list_projects_with_limit",
                description: "List projects with a small limit",
                input: {
                    limit: 1
                },
                expectedOutput: {
                    projects: [sampleProjects[0]],
                    count: 1
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_limit",
                description: "Limit exceeds maximum allowed value",
                input: {
                    limit: 500
                },
                expectedError: {
                    type: "validation",
                    message: "Limit must be between 1 and 100",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    limit: 20
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "addDomain",
        provider: "vercel",
        validCases: [
            {
                name: "add_apex_domain",
                description: "Add an apex domain to a project",
                input: {
                    projectId: "prj_2WjyKQmM8ZnGcJsPWMrHRHrE",
                    name: "flowmaestro.com"
                },
                expectedOutput: {
                    domain: {
                        name: "flowmaestro.com",
                        apexName: "flowmaestro.com",
                        verified: false,
                        createdAt: 1703386800000
                    },
                    message: "Domain flowmaestro.com added successfully"
                }
            },
            {
                name: "add_subdomain",
                description: "Add a subdomain to a project",
                input: {
                    projectId: "prj_2WjyKQmM8ZnGcJsPWMrHRHrE",
                    name: "app.flowmaestro.com"
                },
                expectedOutput: {
                    domain: {
                        name: "app.flowmaestro.com",
                        apexName: "flowmaestro.com",
                        verified: true,
                        createdAt: 1703390400000
                    },
                    message: "Domain app.flowmaestro.com added successfully"
                }
            },
            {
                name: "add_domain_with_redirect",
                description: "Add a domain with redirect configuration",
                input: {
                    projectId: "prj_2WjyKQmM8ZnGcJsPWMrHRHrE",
                    name: "www.flowmaestro.com",
                    redirect: "flowmaestro.com",
                    redirectStatusCode: "301"
                },
                expectedOutput: {
                    domain: {
                        name: "www.flowmaestro.com",
                        apexName: "flowmaestro.com",
                        verified: true,
                        createdAt: 1703394000000,
                        redirect: "flowmaestro.com"
                    },
                    message: "Domain www.flowmaestro.com added successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "project_not_found",
                description: "Project does not exist",
                input: {
                    projectId: "prj_NONEXISTENT12345",
                    name: "example.com"
                },
                expectedError: {
                    type: "not_found",
                    message: "Project not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    projectId: "prj_2WjyKQmM8ZnGcJsPWMrHRHrE",
                    name: "newdomain.com"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listDomains",
        provider: "vercel",
        validCases: [
            {
                name: "list_project_domains",
                description: "List all domains for a project",
                input: {
                    projectId: "prj_2WjyKQmM8ZnGcJsPWMrHRHrE"
                },
                expectedOutput: {
                    domains: [
                        {
                            name: "flowmaestro.com",
                            apexName: "flowmaestro.com",
                            verified: true,
                            createdAt: 1703386800000
                        },
                        {
                            name: "app.flowmaestro.com",
                            apexName: "flowmaestro.com",
                            verified: true,
                            createdAt: 1703390400000
                        },
                        {
                            name: "www.flowmaestro.com",
                            apexName: "flowmaestro.com",
                            verified: true,
                            createdAt: 1703394000000,
                            redirect: "flowmaestro.com"
                        }
                    ],
                    count: 3
                }
            },
            {
                name: "list_domains_with_limit",
                description: "List domains with pagination limit",
                input: {
                    projectId: "prj_2WjyKQmM8ZnGcJsPWMrHRHrE",
                    limit: 2
                },
                expectedOutput: {
                    domains: [
                        {
                            name: "flowmaestro.com",
                            apexName: "flowmaestro.com",
                            verified: true,
                            createdAt: 1703386800000
                        },
                        {
                            name: "app.flowmaestro.com",
                            apexName: "flowmaestro.com",
                            verified: true,
                            createdAt: 1703390400000
                        }
                    ],
                    count: 2
                }
            }
        ],
        errorCases: [
            {
                name: "project_not_found",
                description: "Project does not exist",
                input: {
                    projectId: "prj_NONEXISTENT12345"
                },
                expectedError: {
                    type: "not_found",
                    message: "Project not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    projectId: "prj_2WjyKQmM8ZnGcJsPWMrHRHrE"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getEnvironmentVariables",
        provider: "vercel",
        validCases: [
            {
                name: "get_env_vars",
                description: "Get all environment variables for a project",
                input: {
                    projectId: "prj_2WjyKQmM8ZnGcJsPWMrHRHrE"
                },
                expectedOutput: {
                    environmentVariables: [
                        {
                            id: "env_1aBcDeFgHiJkLmNoPqRsT",
                            key: "DATABASE_URL",
                            value: "[ENCRYPTED]",
                            type: "encrypted",
                            target: ["production", "preview"],
                            createdAt: 1703289600000
                        },
                        {
                            id: "env_2bCdEfGhIjKlMnOpQrStU",
                            key: "NEXT_PUBLIC_API_URL",
                            value: "[ENCRYPTED]",
                            type: "plain",
                            target: ["production", "preview", "development"],
                            createdAt: 1703293200000
                        },
                        {
                            id: "env_3cDeFgHiJkLmNoPqRsTuV",
                            key: "API_SECRET_KEY",
                            value: "[ENCRYPTED]",
                            type: "secret",
                            target: ["production"],
                            createdAt: 1703296800000
                        }
                    ],
                    count: 3
                }
            },
            {
                name: "get_env_vars_decrypted",
                description: "Get environment variables with decrypted values",
                input: {
                    projectId: "prj_2WjyKQmM8ZnGcJsPWMrHRHrE",
                    decrypt: true
                },
                expectedOutput: {
                    environmentVariables: [
                        {
                            id: "env_1aBcDeFgHiJkLmNoPqRsT",
                            key: "DATABASE_URL",
                            value: "postgresql://user:password@db.example.com:5432/flowmaestro",
                            type: "encrypted",
                            target: ["production", "preview"],
                            createdAt: 1703289600000
                        },
                        {
                            id: "env_2bCdEfGhIjKlMnOpQrStU",
                            key: "NEXT_PUBLIC_API_URL",
                            value: "https://api.flowmaestro.com",
                            type: "plain",
                            target: ["production", "preview", "development"],
                            createdAt: 1703293200000
                        }
                    ],
                    count: 2
                }
            }
        ],
        errorCases: [
            {
                name: "project_not_found",
                description: "Project does not exist",
                input: {
                    projectId: "prj_NONEXISTENT12345"
                },
                expectedError: {
                    type: "not_found",
                    message: "Project not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    projectId: "prj_2WjyKQmM8ZnGcJsPWMrHRHrE"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "setEnvironmentVariable",
        provider: "vercel",
        validCases: [
            {
                name: "set_production_env_var",
                description: "Set an encrypted environment variable for production",
                input: {
                    projectId: "prj_2WjyKQmM8ZnGcJsPWMrHRHrE",
                    key: "STRIPE_SECRET_KEY",
                    value: "sk_live_1234567890abcdef",
                    type: "secret",
                    target: ["production"]
                },
                expectedOutput: {
                    environmentVariable: {
                        id: "env_4dEfGhIjKlMnOpQrStUvW",
                        key: "STRIPE_SECRET_KEY",
                        value: "[SET]",
                        type: "secret",
                        target: ["production"],
                        createdAt: 1703400000000
                    },
                    message: "Environment variable STRIPE_SECRET_KEY set successfully"
                }
            },
            {
                name: "set_public_env_var",
                description: "Set a public environment variable for all targets",
                input: {
                    projectId: "prj_2WjyKQmM8ZnGcJsPWMrHRHrE",
                    key: "NEXT_PUBLIC_APP_NAME",
                    value: "FlowMaestro",
                    type: "plain",
                    target: ["production", "preview", "development"]
                },
                expectedOutput: {
                    environmentVariable: {
                        id: "env_5eFgHiJkLmNoPqRsTuVwX",
                        key: "NEXT_PUBLIC_APP_NAME",
                        value: "[SET]",
                        type: "plain",
                        target: ["production", "preview", "development"],
                        createdAt: 1703403600000
                    },
                    message: "Environment variable NEXT_PUBLIC_APP_NAME set successfully"
                }
            },
            {
                name: "set_branch_specific_env_var",
                description: "Set an environment variable for a specific git branch",
                input: {
                    projectId: "prj_2WjyKQmM8ZnGcJsPWMrHRHrE",
                    key: "FEATURE_FLAG_ENABLED",
                    value: "true",
                    type: "plain",
                    target: ["preview"],
                    gitBranch: "feature/new-dashboard"
                },
                expectedOutput: {
                    environmentVariable: {
                        id: "env_6fGhIjKlMnOpQrStUvWxY",
                        key: "FEATURE_FLAG_ENABLED",
                        value: "[SET]",
                        type: "plain",
                        target: ["preview"],
                        gitBranch: "feature/new-dashboard",
                        createdAt: 1703407200000
                    },
                    message: "Environment variable FEATURE_FLAG_ENABLED set successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "project_not_found",
                description: "Project does not exist",
                input: {
                    projectId: "prj_NONEXISTENT12345",
                    key: "TEST_VAR",
                    value: "test",
                    target: ["production"]
                },
                expectedError: {
                    type: "not_found",
                    message: "Project not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    projectId: "prj_2WjyKQmM8ZnGcJsPWMrHRHrE",
                    key: "NEW_VAR",
                    value: "value",
                    target: ["production"]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    }
];
