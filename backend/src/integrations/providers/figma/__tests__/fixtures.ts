/**
 * Figma Provider Test Fixtures
 *
 * Realistic test data for Figma design tool operations including
 * files, nodes, comments, images, and version history.
 */

import type { TestFixture } from "../../../sandbox";

export const figmaFixtures: TestFixture[] = [
    {
        operationId: "createComment",
        provider: "figma",
        validCases: [
            {
                name: "basic_comment",
                description: "Add a simple comment to a Figma file",
                input: {
                    fileKey: "xYz123AbC456dEf",
                    message:
                        "Great work on the hero section! The typography hierarchy looks perfect."
                },
                expectedOutput: {
                    id: "1234567890",
                    file_key: "xYz123AbC456dEf",
                    parent_id: null,
                    user: {
                        id: "987654321",
                        handle: "sarah.designer",
                        img_url: "https://s3-alpha.figma.com/profile/987654321"
                    },
                    created_at: "2024-03-15T14:30:00Z",
                    resolved_at: null,
                    message:
                        "Great work on the hero section! The typography hierarchy looks perfect.",
                    client_meta: null,
                    order_id: "1"
                }
            },
            {
                name: "comment_with_coordinates",
                description: "Add a comment pinned to specific coordinates on canvas",
                input: {
                    fileKey: "pQr789StU012vWx",
                    message: "Can we increase the padding here? It feels too cramped on mobile.",
                    x: 1420.5,
                    y: 892.25
                },
                expectedOutput: {
                    id: "2345678901",
                    file_key: "pQr789StU012vWx",
                    parent_id: null,
                    user: {
                        id: "123456789",
                        handle: "alex.pm",
                        img_url: "https://s3-alpha.figma.com/profile/123456789"
                    },
                    created_at: "2024-03-15T16:45:00Z",
                    resolved_at: null,
                    message: "Can we increase the padding here? It feels too cramped on mobile.",
                    client_meta: {
                        x: 1420.5,
                        y: 892.25
                    },
                    order_id: "2"
                }
            },
            {
                name: "comment_on_specific_node",
                description: "Add a comment attached to a specific design node",
                input: {
                    fileKey: "aBc345DeF678gHi",
                    message:
                        "The button color should match our brand guidelines - use #2563EB instead.",
                    x: 256.0,
                    y: 128.0,
                    nodeId: "1:234"
                },
                expectedOutput: {
                    id: "3456789012",
                    file_key: "aBc345DeF678gHi",
                    parent_id: null,
                    user: {
                        id: "456789123",
                        handle: "brand.manager",
                        img_url: "https://s3-alpha.figma.com/profile/456789123"
                    },
                    created_at: "2024-03-16T09:15:00Z",
                    resolved_at: null,
                    message:
                        "The button color should match our brand guidelines - use #2563EB instead.",
                    client_meta: {
                        x: 256.0,
                        y: 128.0,
                        node_id: "1:234"
                    },
                    order_id: "3"
                }
            },
            {
                name: "reply_to_comment",
                description: "Reply to an existing comment thread",
                input: {
                    fileKey: "jKl901MnO234pQr",
                    message:
                        "Good catch! Updated the color to #2563EB. Let me know if this looks better.",
                    parentId: "3456789012"
                },
                expectedOutput: {
                    id: "4567890123",
                    file_key: "jKl901MnO234pQr",
                    parent_id: "3456789012",
                    user: {
                        id: "789123456",
                        handle: "ui.designer",
                        img_url: "https://s3-alpha.figma.com/profile/789123456"
                    },
                    created_at: "2024-03-16T10:30:00Z",
                    resolved_at: null,
                    message:
                        "Good catch! Updated the color to #2563EB. Let me know if this looks better.",
                    client_meta: null,
                    order_id: "4"
                }
            }
        ],
        errorCases: [
            {
                name: "file_not_found",
                description: "Comment on a non-existent file",
                input: {
                    fileKey: "nonExistentFileKey123",
                    message: "This comment will fail"
                },
                expectedError: {
                    type: "not_found",
                    message: "Figma resource not found.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when creating comments",
                input: {
                    fileKey: "xYz123AbC456dEf",
                    message: "This request exceeds rate limits"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Figma rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            },
            {
                name: "access_denied",
                description: "User lacks permission to comment on file",
                input: {
                    fileKey: "privateFileNoAccess",
                    message: "Attempting to comment on private file"
                },
                expectedError: {
                    type: "permission",
                    message: "You don't have permission to access this Figma resource.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "exportImages",
        provider: "figma",
        validCases: [
            {
                name: "export_single_node_png",
                description: "Export a single frame as PNG at default scale",
                input: {
                    fileKey: "xYz123AbC456dEf",
                    nodeIds: ["1:2"],
                    format: "png"
                },
                expectedOutput: {
                    err: null,
                    images: {
                        "1:2": "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/abc123def456/1_2.png"
                    }
                }
            },
            {
                name: "export_multiple_nodes_jpg",
                description: "Export multiple component frames as JPG images",
                input: {
                    fileKey: "pQr789StU012vWx",
                    nodeIds: ["12:34", "12:56", "12:78"],
                    format: "jpg",
                    scale: 2
                },
                expectedOutput: {
                    err: null,
                    images: {
                        "12:34":
                            "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/def789ghi012/12_34@2x.jpg",
                        "12:56":
                            "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/def789ghi012/12_56@2x.jpg",
                        "12:78":
                            "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/def789ghi012/12_78@2x.jpg"
                    }
                }
            },
            {
                name: "export_svg_with_ids",
                description: "Export icons as SVG with element IDs preserved",
                input: {
                    fileKey: "aBc345DeF678gHi",
                    nodeIds: ["5:100", "5:101", "5:102"],
                    format: "svg",
                    svgIncludeId: true,
                    svgSimplifyStroke: true
                },
                expectedOutput: {
                    err: null,
                    images: {
                        "5:100":
                            "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/jkl345mno678/5_100.svg",
                        "5:101":
                            "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/jkl345mno678/5_101.svg",
                        "5:102":
                            "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/jkl345mno678/5_102.svg"
                    }
                }
            },
            {
                name: "export_pdf_presentation",
                description: "Export presentation slides as PDF",
                input: {
                    fileKey: "jKl901MnO234pQr",
                    nodeIds: ["100:1"],
                    format: "pdf",
                    useAbsoluteBounds: true
                },
                expectedOutput: {
                    err: null,
                    images: {
                        "100:1":
                            "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/pqr901stu234/100_1.pdf"
                    }
                }
            },
            {
                name: "export_high_resolution",
                description: "Export design at 4x scale for print",
                input: {
                    fileKey: "vWx567YzA890bCd",
                    nodeIds: ["200:50"],
                    format: "png",
                    scale: 4
                },
                expectedOutput: {
                    err: null,
                    images: {
                        "200:50":
                            "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/efg567hij890/200_50@4x.png"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "file_not_found",
                description: "Export from a non-existent file",
                input: {
                    fileKey: "nonExistentFileKey123",
                    nodeIds: ["1:2"],
                    format: "png"
                },
                expectedError: {
                    type: "not_found",
                    message: "Figma resource not found.",
                    retryable: false
                }
            },
            {
                name: "invalid_node_id",
                description: "Export with invalid node ID format",
                input: {
                    fileKey: "xYz123AbC456dEf",
                    nodeIds: ["invalid-node-id"],
                    format: "png"
                },
                expectedError: {
                    type: "validation",
                    message: "Figma API error: Invalid node ID format",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded during bulk export",
                input: {
                    fileKey: "xYz123AbC456dEf",
                    nodeIds: ["1:1", "1:2", "1:3", "1:4", "1:5"],
                    format: "png",
                    scale: 4
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Figma rate limit exceeded (file_images). Retry after 30 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getFile",
        provider: "figma",
        validCases: [
            {
                name: "get_complete_file",
                description: "Retrieve complete file data with document tree",
                input: {
                    fileKey: "xYz123AbC456dEf"
                },
                expectedOutput: {
                    name: "Mobile App Design System",
                    lastModified: "2024-03-15T18:42:00Z",
                    thumbnailUrl: "https://s3-alpha-sig.figma.com/thumbnails/abc123/thumbnail.png",
                    version: "5678901234",
                    role: "editor",
                    editorType: "figma",
                    linkAccess: "view",
                    document: {
                        id: "0:0",
                        name: "Document",
                        type: "DOCUMENT",
                        children: [
                            {
                                id: "1:1",
                                name: "Cover",
                                type: "CANVAS",
                                backgroundColor: {
                                    r: 0.11764705926179886,
                                    g: 0.11764705926179886,
                                    b: 0.11764705926179886,
                                    a: 1
                                },
                                children: [
                                    {
                                        id: "1:2",
                                        name: "Cover Frame",
                                        type: "FRAME",
                                        absoluteBoundingBox: {
                                            x: 0,
                                            y: 0,
                                            width: 1440,
                                            height: 900
                                        }
                                    }
                                ]
                            },
                            {
                                id: "2:1",
                                name: "Components",
                                type: "CANVAS",
                                backgroundColor: {
                                    r: 0.9607843160629272,
                                    g: 0.9607843160629272,
                                    b: 0.9607843160629272,
                                    a: 1
                                },
                                children: [
                                    {
                                        id: "2:100",
                                        name: "Button/Primary",
                                        type: "COMPONENT",
                                        absoluteBoundingBox: {
                                            x: 100,
                                            y: 100,
                                            width: 120,
                                            height: 48
                                        }
                                    },
                                    {
                                        id: "2:101",
                                        name: "Button/Secondary",
                                        type: "COMPONENT",
                                        absoluteBoundingBox: {
                                            x: 100,
                                            y: 180,
                                            width: 120,
                                            height: 48
                                        }
                                    },
                                    {
                                        id: "2:200",
                                        name: "Input/Text Field",
                                        type: "COMPONENT",
                                        absoluteBoundingBox: {
                                            x: 300,
                                            y: 100,
                                            width: 280,
                                            height: 56
                                        }
                                    }
                                ]
                            },
                            {
                                id: "3:1",
                                name: "Screens",
                                type: "CANVAS",
                                backgroundColor: {
                                    r: 0.9607843160629272,
                                    g: 0.9607843160629272,
                                    b: 0.9607843160629272,
                                    a: 1
                                },
                                children: [
                                    {
                                        id: "3:100",
                                        name: "Home Screen",
                                        type: "FRAME",
                                        absoluteBoundingBox: {
                                            x: 0,
                                            y: 0,
                                            width: 375,
                                            height: 812
                                        }
                                    },
                                    {
                                        id: "3:200",
                                        name: "Profile Screen",
                                        type: "FRAME",
                                        absoluteBoundingBox: {
                                            x: 425,
                                            y: 0,
                                            width: 375,
                                            height: 812
                                        }
                                    }
                                ]
                            }
                        ]
                    },
                    components: {
                        "2:100": {
                            key: "btn_primary_v1",
                            name: "Button/Primary",
                            description: "Primary action button with brand color",
                            componentSetId: null
                        },
                        "2:101": {
                            key: "btn_secondary_v1",
                            name: "Button/Secondary",
                            description: "Secondary action button with outline style",
                            componentSetId: null
                        },
                        "2:200": {
                            key: "input_text_v1",
                            name: "Input/Text Field",
                            description: "Standard text input field with label and helper text",
                            componentSetId: null
                        }
                    },
                    styles: {
                        "S:abc123": {
                            key: "abc123",
                            name: "Primary/500",
                            styleType: "FILL",
                            description: "Main brand color"
                        },
                        "S:def456": {
                            key: "def456",
                            name: "Heading/H1",
                            styleType: "TEXT",
                            description: "Primary heading style"
                        }
                    },
                    schemaVersion: 0,
                    mainFileKey: null,
                    branches: []
                }
            },
            {
                name: "get_file_with_depth_limit",
                description: "Retrieve file with limited tree depth",
                input: {
                    fileKey: "pQr789StU012vWx",
                    depth: 2
                },
                expectedOutput: {
                    name: "Landing Page Redesign",
                    lastModified: "2024-03-14T10:15:00Z",
                    thumbnailUrl: "https://s3-alpha-sig.figma.com/thumbnails/def456/thumbnail.png",
                    version: "4567890123",
                    role: "viewer",
                    editorType: "figma",
                    linkAccess: "view",
                    document: {
                        id: "0:0",
                        name: "Document",
                        type: "DOCUMENT",
                        children: [
                            {
                                id: "1:1",
                                name: "Desktop",
                                type: "CANVAS",
                                backgroundColor: {
                                    r: 1,
                                    g: 1,
                                    b: 1,
                                    a: 1
                                },
                                children: []
                            },
                            {
                                id: "2:1",
                                name: "Mobile",
                                type: "CANVAS",
                                backgroundColor: {
                                    r: 1,
                                    g: 1,
                                    b: 1,
                                    a: 1
                                },
                                children: []
                            }
                        ]
                    },
                    components: {},
                    styles: {},
                    schemaVersion: 0,
                    mainFileKey: null,
                    branches: []
                }
            },
            {
                name: "get_specific_version",
                description: "Retrieve file at a specific version",
                input: {
                    fileKey: "aBc345DeF678gHi",
                    version: "3456789012"
                },
                expectedOutput: {
                    name: "Icon Library v2.0",
                    lastModified: "2024-02-28T14:00:00Z",
                    thumbnailUrl: "https://s3-alpha-sig.figma.com/thumbnails/ghi789/thumbnail.png",
                    version: "3456789012",
                    role: "editor",
                    editorType: "figma",
                    linkAccess: "edit",
                    document: {
                        id: "0:0",
                        name: "Document",
                        type: "DOCUMENT",
                        children: [
                            {
                                id: "1:1",
                                name: "16px Icons",
                                type: "CANVAS",
                                backgroundColor: {
                                    r: 1,
                                    g: 1,
                                    b: 1,
                                    a: 1
                                },
                                children: []
                            }
                        ]
                    },
                    components: {},
                    styles: {},
                    schemaVersion: 0,
                    mainFileKey: null,
                    branches: []
                }
            },
            {
                name: "get_file_with_geometry",
                description: "Retrieve file including vector path geometry data",
                input: {
                    fileKey: "jKl901MnO234pQr",
                    includeGeometry: true
                },
                expectedOutput: {
                    name: "Logo Variations",
                    lastModified: "2024-03-10T09:30:00Z",
                    thumbnailUrl: "https://s3-alpha-sig.figma.com/thumbnails/jkl012/thumbnail.png",
                    version: "2345678901",
                    role: "editor",
                    editorType: "figma",
                    linkAccess: "edit",
                    document: {
                        id: "0:0",
                        name: "Document",
                        type: "DOCUMENT",
                        children: [
                            {
                                id: "1:1",
                                name: "Primary Logo",
                                type: "CANVAS",
                                backgroundColor: {
                                    r: 1,
                                    g: 1,
                                    b: 1,
                                    a: 1
                                },
                                children: [
                                    {
                                        id: "1:50",
                                        name: "Logo Mark",
                                        type: "VECTOR",
                                        absoluteBoundingBox: {
                                            x: 100,
                                            y: 100,
                                            width: 200,
                                            height: 200
                                        },
                                        fillGeometry: [
                                            {
                                                path: "M 0 100 C 0 44.772 44.772 0 100 0 C 155.228 0 200 44.772 200 100 C 200 155.228 155.228 200 100 200 C 44.772 200 0 155.228 0 100 Z",
                                                windingRule: "NONZERO"
                                            }
                                        ],
                                        strokeGeometry: []
                                    }
                                ]
                            }
                        ]
                    },
                    components: {},
                    styles: {},
                    schemaVersion: 0,
                    mainFileKey: null,
                    branches: []
                }
            },
            {
                name: "get_file_with_branch_data",
                description: "Retrieve file including branch metadata",
                input: {
                    fileKey: "vWx567YzA890bCd",
                    branchData: true
                },
                expectedOutput: {
                    name: "E-commerce UI Kit",
                    lastModified: "2024-03-12T16:20:00Z",
                    thumbnailUrl: "https://s3-alpha-sig.figma.com/thumbnails/mno345/thumbnail.png",
                    version: "1234567890",
                    role: "editor",
                    editorType: "figma",
                    linkAccess: "edit",
                    document: {
                        id: "0:0",
                        name: "Document",
                        type: "DOCUMENT",
                        children: []
                    },
                    components: {},
                    styles: {},
                    schemaVersion: 0,
                    mainFileKey: "vWx567YzA890bCd",
                    branches: [
                        {
                            key: "branchKey123",
                            name: "Feature: Dark Mode",
                            thumbnail_url:
                                "https://s3-alpha-sig.figma.com/thumbnails/branch1/thumbnail.png",
                            last_modified: "2024-03-11T14:00:00Z"
                        },
                        {
                            key: "branchKey456",
                            name: "Experiment: New Checkout Flow",
                            thumbnail_url:
                                "https://s3-alpha-sig.figma.com/thumbnails/branch2/thumbnail.png",
                            last_modified: "2024-03-10T11:30:00Z"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "file_not_found",
                description: "Get a non-existent file",
                input: {
                    fileKey: "nonExistentFileKey123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Figma resource not found.",
                    retryable: false
                }
            },
            {
                name: "access_denied",
                description: "User lacks permission to view file",
                input: {
                    fileKey: "privateTeamFile789"
                },
                expectedError: {
                    type: "permission",
                    message: "You don't have permission to access this Figma resource.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when fetching file",
                input: {
                    fileKey: "xYz123AbC456dEf"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Figma rate limit exceeded (files). Retry after 60 seconds.",
                    retryable: true
                }
            },
            {
                name: "invalid_version",
                description: "Get file with non-existent version ID",
                input: {
                    fileKey: "xYz123AbC456dEf",
                    version: "9999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Figma API error: Version not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getFileNodes",
        provider: "figma",
        validCases: [
            {
                name: "get_single_node",
                description: "Retrieve a single component node by ID",
                input: {
                    fileKey: "xYz123AbC456dEf",
                    nodeIds: ["2:100"]
                },
                expectedOutput: {
                    name: "Mobile App Design System",
                    lastModified: "2024-03-15T18:42:00Z",
                    thumbnailUrl: "https://s3-alpha-sig.figma.com/thumbnails/abc123/thumbnail.png",
                    version: "5678901234",
                    role: "editor",
                    err: null,
                    nodes: {
                        "2:100": {
                            document: {
                                id: "2:100",
                                name: "Button/Primary",
                                type: "COMPONENT",
                                absoluteBoundingBox: {
                                    x: 100,
                                    y: 100,
                                    width: 120,
                                    height: 48
                                },
                                blendMode: "PASS_THROUGH",
                                children: [
                                    {
                                        id: "2:100:1",
                                        name: "Background",
                                        type: "RECTANGLE",
                                        absoluteBoundingBox: {
                                            x: 100,
                                            y: 100,
                                            width: 120,
                                            height: 48
                                        },
                                        fills: [
                                            {
                                                blendMode: "NORMAL",
                                                type: "SOLID",
                                                color: {
                                                    r: 0.1450980453,
                                                    g: 0.3882353008,
                                                    b: 0.9215686321,
                                                    a: 1
                                                }
                                            }
                                        ],
                                        cornerRadius: 8
                                    },
                                    {
                                        id: "2:100:2",
                                        name: "Label",
                                        type: "TEXT",
                                        absoluteBoundingBox: {
                                            x: 130,
                                            y: 114,
                                            width: 60,
                                            height: 20
                                        },
                                        characters: "Button",
                                        style: {
                                            fontFamily: "Inter",
                                            fontWeight: 600,
                                            fontSize: 14,
                                            textAlignHorizontal: "CENTER",
                                            textAlignVertical: "CENTER",
                                            letterSpacing: 0,
                                            lineHeightPx: 20
                                        },
                                        fills: [
                                            {
                                                blendMode: "NORMAL",
                                                type: "SOLID",
                                                color: {
                                                    r: 1,
                                                    g: 1,
                                                    b: 1,
                                                    a: 1
                                                }
                                            }
                                        ]
                                    }
                                ],
                                backgroundColor: {
                                    r: 0,
                                    g: 0,
                                    b: 0,
                                    a: 0
                                },
                                constraints: {
                                    vertical: "TOP",
                                    horizontal: "LEFT"
                                }
                            },
                            components: {
                                "2:100": {
                                    key: "btn_primary_v1",
                                    name: "Button/Primary",
                                    description: "Primary action button with brand color"
                                }
                            },
                            styles: {}
                        }
                    }
                }
            },
            {
                name: "get_multiple_nodes",
                description: "Retrieve multiple screen frames simultaneously",
                input: {
                    fileKey: "xYz123AbC456dEf",
                    nodeIds: ["3:100", "3:200"]
                },
                expectedOutput: {
                    name: "Mobile App Design System",
                    lastModified: "2024-03-15T18:42:00Z",
                    thumbnailUrl: "https://s3-alpha-sig.figma.com/thumbnails/abc123/thumbnail.png",
                    version: "5678901234",
                    role: "editor",
                    err: null,
                    nodes: {
                        "3:100": {
                            document: {
                                id: "3:100",
                                name: "Home Screen",
                                type: "FRAME",
                                absoluteBoundingBox: {
                                    x: 0,
                                    y: 0,
                                    width: 375,
                                    height: 812
                                },
                                blendMode: "PASS_THROUGH",
                                backgroundColor: {
                                    r: 1,
                                    g: 1,
                                    b: 1,
                                    a: 1
                                },
                                children: []
                            },
                            components: {},
                            styles: {}
                        },
                        "3:200": {
                            document: {
                                id: "3:200",
                                name: "Profile Screen",
                                type: "FRAME",
                                absoluteBoundingBox: {
                                    x: 425,
                                    y: 0,
                                    width: 375,
                                    height: 812
                                },
                                blendMode: "PASS_THROUGH",
                                backgroundColor: {
                                    r: 0.9607843160629272,
                                    g: 0.9607843160629272,
                                    b: 0.9607843160629272,
                                    a: 1
                                },
                                children: []
                            },
                            components: {},
                            styles: {}
                        }
                    }
                }
            },
            {
                name: "get_nodes_with_depth",
                description: "Retrieve nodes with limited tree depth",
                input: {
                    fileKey: "pQr789StU012vWx",
                    nodeIds: ["10:1"],
                    depth: 1
                },
                expectedOutput: {
                    name: "Landing Page Redesign",
                    lastModified: "2024-03-14T10:15:00Z",
                    thumbnailUrl: "https://s3-alpha-sig.figma.com/thumbnails/def456/thumbnail.png",
                    version: "4567890123",
                    role: "viewer",
                    err: null,
                    nodes: {
                        "10:1": {
                            document: {
                                id: "10:1",
                                name: "Hero Section",
                                type: "FRAME",
                                absoluteBoundingBox: {
                                    x: 0,
                                    y: 0,
                                    width: 1440,
                                    height: 720
                                },
                                blendMode: "PASS_THROUGH",
                                backgroundColor: {
                                    r: 0.05098039284348488,
                                    g: 0.05098039284348488,
                                    b: 0.05098039284348488,
                                    a: 1
                                },
                                children: []
                            },
                            components: {},
                            styles: {}
                        }
                    }
                }
            },
            {
                name: "get_nodes_specific_version",
                description: "Retrieve nodes from a specific file version",
                input: {
                    fileKey: "aBc345DeF678gHi",
                    nodeIds: ["5:100"],
                    version: "3456789012"
                },
                expectedOutput: {
                    name: "Icon Library v2.0",
                    lastModified: "2024-02-28T14:00:00Z",
                    thumbnailUrl: "https://s3-alpha-sig.figma.com/thumbnails/ghi789/thumbnail.png",
                    version: "3456789012",
                    role: "editor",
                    err: null,
                    nodes: {
                        "5:100": {
                            document: {
                                id: "5:100",
                                name: "icon/chevron-right",
                                type: "COMPONENT",
                                absoluteBoundingBox: {
                                    x: 0,
                                    y: 0,
                                    width: 16,
                                    height: 16
                                },
                                blendMode: "PASS_THROUGH",
                                backgroundColor: {
                                    r: 0,
                                    g: 0,
                                    b: 0,
                                    a: 0
                                },
                                children: [
                                    {
                                        id: "5:100:1",
                                        name: "Vector",
                                        type: "VECTOR",
                                        absoluteBoundingBox: {
                                            x: 5,
                                            y: 3,
                                            width: 6,
                                            height: 10
                                        },
                                        fills: [
                                            {
                                                blendMode: "NORMAL",
                                                type: "SOLID",
                                                color: {
                                                    r: 0,
                                                    g: 0,
                                                    b: 0,
                                                    a: 1
                                                }
                                            }
                                        ],
                                        strokes: []
                                    }
                                ]
                            },
                            components: {
                                "5:100": {
                                    key: "icon_chevron_right_16",
                                    name: "icon/chevron-right",
                                    description: "Chevron right icon, 16px"
                                }
                            },
                            styles: {}
                        }
                    }
                }
            },
            {
                name: "get_nodes_with_geometry",
                description: "Retrieve vector nodes with path geometry",
                input: {
                    fileKey: "jKl901MnO234pQr",
                    nodeIds: ["1:50"],
                    includeGeometry: true
                },
                expectedOutput: {
                    name: "Logo Variations",
                    lastModified: "2024-03-10T09:30:00Z",
                    thumbnailUrl: "https://s3-alpha-sig.figma.com/thumbnails/jkl012/thumbnail.png",
                    version: "2345678901",
                    role: "editor",
                    err: null,
                    nodes: {
                        "1:50": {
                            document: {
                                id: "1:50",
                                name: "Logo Mark",
                                type: "VECTOR",
                                absoluteBoundingBox: {
                                    x: 100,
                                    y: 100,
                                    width: 200,
                                    height: 200
                                },
                                blendMode: "PASS_THROUGH",
                                fills: [
                                    {
                                        blendMode: "NORMAL",
                                        type: "SOLID",
                                        color: {
                                            r: 0.1450980453,
                                            g: 0.3882353008,
                                            b: 0.9215686321,
                                            a: 1
                                        }
                                    }
                                ],
                                strokes: [],
                                fillGeometry: [
                                    {
                                        path: "M 0 100 C 0 44.772 44.772 0 100 0 C 155.228 0 200 44.772 200 100 C 200 155.228 155.228 200 100 200 C 44.772 200 0 155.228 0 100 Z",
                                        windingRule: "NONZERO"
                                    }
                                ],
                                strokeGeometry: []
                            },
                            components: {},
                            styles: {}
                        }
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "file_not_found",
                description: "Get nodes from a non-existent file",
                input: {
                    fileKey: "nonExistentFileKey123",
                    nodeIds: ["1:2"]
                },
                expectedError: {
                    type: "not_found",
                    message: "Figma resource not found.",
                    retryable: false
                }
            },
            {
                name: "node_not_found",
                description: "Get non-existent node IDs",
                input: {
                    fileKey: "xYz123AbC456dEf",
                    nodeIds: ["9999:9999"]
                },
                expectedError: {
                    type: "not_found",
                    message: "Figma API error: Node not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when fetching nodes",
                input: {
                    fileKey: "xYz123AbC456dEf",
                    nodeIds: ["1:1", "1:2", "1:3", "1:4", "1:5", "1:6", "1:7", "1:8", "1:9", "1:10"]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Figma rate limit exceeded. Retry after 45 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getFileVersions",
        provider: "figma",
        validCases: [
            {
                name: "get_version_history",
                description: "Retrieve complete version history for a file",
                input: {
                    fileKey: "xYz123AbC456dEf"
                },
                expectedOutput: {
                    versions: [
                        {
                            id: "5678901234",
                            created_at: "2024-03-15T18:42:00Z",
                            label: "Final Design Review",
                            description: "Approved by stakeholders, ready for development handoff",
                            user: {
                                id: "987654321",
                                handle: "sarah.designer",
                                img_url: "https://s3-alpha.figma.com/profile/987654321"
                            }
                        },
                        {
                            id: "5678901233",
                            created_at: "2024-03-14T16:30:00Z",
                            label: "Updated Components",
                            description:
                                "Refined button states and input field styles based on feedback",
                            user: {
                                id: "987654321",
                                handle: "sarah.designer",
                                img_url: "https://s3-alpha.figma.com/profile/987654321"
                            }
                        },
                        {
                            id: "5678901232",
                            created_at: "2024-03-13T11:15:00Z",
                            label: "Added Dark Mode",
                            description: "Complete dark mode color tokens and component variants",
                            user: {
                                id: "123456789",
                                handle: "alex.lead",
                                img_url: "https://s3-alpha.figma.com/profile/123456789"
                            }
                        },
                        {
                            id: "5678901231",
                            created_at: "2024-03-12T09:00:00Z",
                            label: "Initial Setup",
                            description: "Base design system structure with core components",
                            user: {
                                id: "987654321",
                                handle: "sarah.designer",
                                img_url: "https://s3-alpha.figma.com/profile/987654321"
                            }
                        },
                        {
                            id: "5678901230",
                            created_at: "2024-03-11T14:45:00Z",
                            label: null,
                            description: null,
                            user: {
                                id: "987654321",
                                handle: "sarah.designer",
                                img_url: "https://s3-alpha.figma.com/profile/987654321"
                            }
                        }
                    ]
                }
            },
            {
                name: "get_versions_new_file",
                description: "Retrieve versions for a newly created file",
                input: {
                    fileKey: "newFile123AbC456"
                },
                expectedOutput: {
                    versions: [
                        {
                            id: "1000000001",
                            created_at: "2024-03-15T20:00:00Z",
                            label: null,
                            description: null,
                            user: {
                                id: "456789123",
                                handle: "new.designer",
                                img_url: "https://s3-alpha.figma.com/profile/456789123"
                            }
                        }
                    ]
                }
            },
            {
                name: "get_versions_collaborative_file",
                description: "Retrieve versions showing multiple contributors",
                input: {
                    fileKey: "teamProject789StU"
                },
                expectedOutput: {
                    versions: [
                        {
                            id: "7890123456",
                            created_at: "2024-03-15T17:00:00Z",
                            label: "Sprint 12 Complete",
                            description: "All sprint deliverables finalized",
                            user: {
                                id: "111222333",
                                handle: "pm.manager",
                                img_url: "https://s3-alpha.figma.com/profile/111222333"
                            }
                        },
                        {
                            id: "7890123455",
                            created_at: "2024-03-15T15:30:00Z",
                            label: "Checkout Flow",
                            description: "New checkout experience with Apple Pay integration",
                            user: {
                                id: "444555666",
                                handle: "ux.researcher",
                                img_url: "https://s3-alpha.figma.com/profile/444555666"
                            }
                        },
                        {
                            id: "7890123454",
                            created_at: "2024-03-15T12:00:00Z",
                            label: "Product Cards Redesign",
                            description: "Updated product card component with new imagery",
                            user: {
                                id: "777888999",
                                handle: "visual.designer",
                                img_url: "https://s3-alpha.figma.com/profile/777888999"
                            }
                        },
                        {
                            id: "7890123453",
                            created_at: "2024-03-14T18:45:00Z",
                            label: "Accessibility Updates",
                            description: "Improved color contrast ratios and focus states",
                            user: {
                                id: "987654321",
                                handle: "sarah.designer",
                                img_url: "https://s3-alpha.figma.com/profile/987654321"
                            }
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "file_not_found",
                description: "Get versions for a non-existent file",
                input: {
                    fileKey: "nonExistentFileKey123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Figma resource not found.",
                    retryable: false
                }
            },
            {
                name: "access_denied",
                description: "Get versions for file without access",
                input: {
                    fileKey: "privateTeamFile789"
                },
                expectedError: {
                    type: "permission",
                    message: "You don't have permission to access this Figma resource.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when fetching versions",
                input: {
                    fileKey: "xYz123AbC456dEf"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Figma rate limit exceeded. Retry after 30 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listComments",
        provider: "figma",
        validCases: [
            {
                name: "list_all_comments",
                description: "Retrieve all comments on a file",
                input: {
                    fileKey: "xYz123AbC456dEf"
                },
                expectedOutput: {
                    comments: [
                        {
                            id: "1234567890",
                            file_key: "xYz123AbC456dEf",
                            parent_id: null,
                            user: {
                                id: "987654321",
                                handle: "sarah.designer",
                                img_url: "https://s3-alpha.figma.com/profile/987654321"
                            },
                            created_at: "2024-03-15T14:30:00Z",
                            resolved_at: null,
                            message:
                                "Great work on the hero section! The typography hierarchy looks perfect.",
                            client_meta: {
                                x: 720.5,
                                y: 360.25,
                                node_id: "3:100"
                            },
                            order_id: "1"
                        },
                        {
                            id: "1234567891",
                            file_key: "xYz123AbC456dEf",
                            parent_id: "1234567890",
                            user: {
                                id: "123456789",
                                handle: "alex.lead",
                                img_url: "https://s3-alpha.figma.com/profile/123456789"
                            },
                            created_at: "2024-03-15T15:00:00Z",
                            resolved_at: null,
                            message: "Thanks! I spent extra time on the line heights.",
                            client_meta: null,
                            order_id: "2"
                        },
                        {
                            id: "2345678901",
                            file_key: "xYz123AbC456dEf",
                            parent_id: null,
                            user: {
                                id: "456789123",
                                handle: "pm.product",
                                img_url: "https://s3-alpha.figma.com/profile/456789123"
                            },
                            created_at: "2024-03-15T16:45:00Z",
                            resolved_at: "2024-03-15T18:00:00Z",
                            message:
                                "Can we make the CTA button more prominent? Maybe larger or different color?",
                            client_meta: {
                                x: 1420.5,
                                y: 892.25,
                                node_id: "3:150"
                            },
                            order_id: "3"
                        },
                        {
                            id: "3456789012",
                            file_key: "xYz123AbC456dEf",
                            parent_id: null,
                            user: {
                                id: "789123456",
                                handle: "dev.frontend",
                                img_url: "https://s3-alpha.figma.com/profile/789123456"
                            },
                            created_at: "2024-03-15T17:30:00Z",
                            resolved_at: null,
                            message:
                                "What's the expected hover state for these cards? I don't see it in the component variants.",
                            client_meta: {
                                x: 200.0,
                                y: 500.0,
                                node_id: "2:300"
                            },
                            order_id: "4"
                        },
                        {
                            id: "3456789013",
                            file_key: "xYz123AbC456dEf",
                            parent_id: "3456789012",
                            user: {
                                id: "987654321",
                                handle: "sarah.designer",
                                img_url: "https://s3-alpha.figma.com/profile/987654321"
                            },
                            created_at: "2024-03-15T17:45:00Z",
                            resolved_at: null,
                            message:
                                "Good catch! I'll add the hover states today. Should be a subtle shadow lift + scale.",
                            client_meta: null,
                            order_id: "5"
                        }
                    ]
                }
            },
            {
                name: "list_comments_empty",
                description: "Retrieve comments from a file with no comments",
                input: {
                    fileKey: "newFileNoComments"
                },
                expectedOutput: {
                    comments: []
                }
            },
            {
                name: "list_comments_resolved_thread",
                description: "Retrieve comments including fully resolved threads",
                input: {
                    fileKey: "completedReview123"
                },
                expectedOutput: {
                    comments: [
                        {
                            id: "5000000001",
                            file_key: "completedReview123",
                            parent_id: null,
                            user: {
                                id: "111222333",
                                handle: "design.reviewer",
                                img_url: "https://s3-alpha.figma.com/profile/111222333"
                            },
                            created_at: "2024-03-10T10:00:00Z",
                            resolved_at: "2024-03-12T14:30:00Z",
                            message:
                                "The spacing between these elements should be 24px, not 16px per our design system.",
                            client_meta: {
                                x: 400.0,
                                y: 250.0,
                                node_id: "10:50"
                            },
                            order_id: "1"
                        },
                        {
                            id: "5000000002",
                            file_key: "completedReview123",
                            parent_id: "5000000001",
                            user: {
                                id: "987654321",
                                handle: "sarah.designer",
                                img_url: "https://s3-alpha.figma.com/profile/987654321"
                            },
                            created_at: "2024-03-11T09:00:00Z",
                            resolved_at: "2024-03-12T14:30:00Z",
                            message: "Fixed! Updated all instances to use the 24px spacing token.",
                            client_meta: null,
                            order_id: "2"
                        },
                        {
                            id: "5000000003",
                            file_key: "completedReview123",
                            parent_id: "5000000001",
                            user: {
                                id: "111222333",
                                handle: "design.reviewer",
                                img_url: "https://s3-alpha.figma.com/profile/111222333"
                            },
                            created_at: "2024-03-12T14:30:00Z",
                            resolved_at: "2024-03-12T14:30:00Z",
                            message: "Perfect, looks good now!",
                            client_meta: null,
                            order_id: "3"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "file_not_found",
                description: "List comments on a non-existent file",
                input: {
                    fileKey: "nonExistentFileKey123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Figma resource not found.",
                    retryable: false
                }
            },
            {
                name: "access_denied",
                description: "List comments on file without access",
                input: {
                    fileKey: "privateTeamFile789"
                },
                expectedError: {
                    type: "permission",
                    message: "You don't have permission to access this Figma resource.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when listing comments",
                input: {
                    fileKey: "xYz123AbC456dEf"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Figma rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    }
];
