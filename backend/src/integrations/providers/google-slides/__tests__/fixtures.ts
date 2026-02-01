/**
 * Google Slides Provider Test Fixtures
 */

import type { TestFixture } from "../../../sandbox";

export const googleSlidesFixtures: TestFixture[] = [
    {
        operationId: "batchUpdate",
        provider: "google-slides",
        validCases: [
            {
                name: "create_new_slide",
                description: "Create a new slide in presentation using batchUpdate",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    requests: [
                        {
                            createSlide: {
                                objectId: "slide_001",
                                insertionIndex: 1,
                                slideLayoutReference: {
                                    predefinedLayout: "TITLE_AND_BODY"
                                }
                            }
                        }
                    ]
                },
                expectedOutput: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    replies: [
                        {
                            createSlide: {
                                objectId: "slide_001"
                            }
                        }
                    ],
                    writeControl: {
                        requiredRevisionId: "rev_abc123"
                    }
                }
            },
            {
                name: "insert_text_into_shape",
                description: "Insert text into an existing shape element",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    requests: [
                        {
                            insertText: {
                                objectId: "shape_title_001",
                                insertionIndex: 0,
                                text: "Q4 2024 Sales Performance Review"
                            }
                        }
                    ]
                },
                expectedOutput: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    replies: [{}],
                    writeControl: {
                        requiredRevisionId: "rev_def456"
                    }
                }
            },
            {
                name: "create_shape",
                description: "Create a rectangle shape on a slide",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    requests: [
                        {
                            createShape: {
                                objectId: "shape_rect_001",
                                shapeType: "RECTANGLE",
                                elementProperties: {
                                    pageObjectId: "slide_001",
                                    size: {
                                        width: { magnitude: 300, unit: "PT" },
                                        height: { magnitude: 150, unit: "PT" }
                                    },
                                    transform: {
                                        scaleX: 1,
                                        scaleY: 1,
                                        translateX: 100,
                                        translateY: 200,
                                        unit: "PT"
                                    }
                                }
                            }
                        }
                    ]
                },
                expectedOutput: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    replies: [
                        {
                            createShape: {
                                objectId: "shape_rect_001"
                            }
                        }
                    ],
                    writeControl: {
                        requiredRevisionId: "rev_ghi789"
                    }
                }
            },
            {
                name: "replace_all_text",
                description: "Replace all occurrences of placeholder text",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    requests: [
                        {
                            replaceAllText: {
                                containsText: {
                                    text: "{{COMPANY_NAME}}",
                                    matchCase: true
                                },
                                replaceText: "Acme Corporation"
                            }
                        },
                        {
                            replaceAllText: {
                                containsText: {
                                    text: "{{QUARTER}}",
                                    matchCase: true
                                },
                                replaceText: "Q4 2024"
                            }
                        }
                    ]
                },
                expectedOutput: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    replies: [
                        {
                            replaceAllText: {
                                occurrencesChanged: 5
                            }
                        },
                        {
                            replaceAllText: {
                                occurrencesChanged: 3
                            }
                        }
                    ],
                    writeControl: {
                        requiredRevisionId: "rev_jkl012"
                    }
                }
            },
            {
                name: "duplicate_slide",
                description: "Duplicate an existing slide",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    requests: [
                        {
                            duplicateObject: {
                                objectId: "slide_001",
                                objectIds: {
                                    slide_001: "slide_001_copy"
                                }
                            }
                        }
                    ]
                },
                expectedOutput: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    replies: [
                        {
                            duplicateObject: {
                                objectId: "slide_001_copy"
                            }
                        }
                    ],
                    writeControl: {
                        requiredRevisionId: "rev_mno345"
                    }
                }
            },
            {
                name: "delete_object",
                description: "Delete a shape from a slide",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    requests: [
                        {
                            deleteObject: {
                                objectId: "shape_old_001"
                            }
                        }
                    ]
                },
                expectedOutput: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    replies: [{}],
                    writeControl: {
                        requiredRevisionId: "rev_pqr678"
                    }
                }
            },
            {
                name: "update_page_properties",
                description: "Update slide background color",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    requests: [
                        {
                            updatePageProperties: {
                                objectId: "slide_001",
                                pageProperties: {
                                    pageBackgroundFill: {
                                        solidFill: {
                                            color: {
                                                rgbColor: {
                                                    red: 0.1,
                                                    green: 0.2,
                                                    blue: 0.4
                                                }
                                            }
                                        }
                                    }
                                },
                                fields: "pageBackgroundFill"
                            }
                        }
                    ]
                },
                expectedOutput: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    replies: [{}],
                    writeControl: {
                        requiredRevisionId: "rev_stu901"
                    }
                }
            },
            {
                name: "multiple_operations_atomic",
                description: "Execute multiple operations atomically in single batch",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    requests: [
                        {
                            createSlide: {
                                objectId: "slide_summary",
                                insertionIndex: 0,
                                slideLayoutReference: {
                                    predefinedLayout: "TITLE_ONLY"
                                }
                            }
                        },
                        {
                            insertText: {
                                objectId: "slide_summary_title",
                                insertionIndex: 0,
                                text: "Executive Summary"
                            }
                        },
                        {
                            createShape: {
                                objectId: "shape_chart_placeholder",
                                shapeType: "RECTANGLE",
                                elementProperties: {
                                    pageObjectId: "slide_summary",
                                    size: {
                                        width: { magnitude: 500, unit: "PT" },
                                        height: { magnitude: 300, unit: "PT" }
                                    },
                                    transform: {
                                        scaleX: 1,
                                        scaleY: 1,
                                        translateX: 50,
                                        translateY: 100,
                                        unit: "PT"
                                    }
                                }
                            }
                        }
                    ]
                },
                expectedOutput: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    replies: [
                        {
                            createSlide: {
                                objectId: "slide_summary"
                            }
                        },
                        {},
                        {
                            createShape: {
                                objectId: "shape_chart_placeholder"
                            }
                        }
                    ],
                    writeControl: {
                        requiredRevisionId: "rev_xyz234"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "presentation_not_found",
                description: "Presentation does not exist",
                input: {
                    presentationId: "nonexistent-presentation-id",
                    requests: [
                        {
                            createSlide: {
                                objectId: "slide_001",
                                insertionIndex: 1
                            }
                        }
                    ]
                },
                expectedError: {
                    type: "not_found",
                    message: "Presentation not found",
                    retryable: false
                }
            },
            {
                name: "invalid_object_id",
                description: "Referenced object does not exist",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    requests: [
                        {
                            insertText: {
                                objectId: "nonexistent_shape",
                                insertionIndex: 0,
                                text: "Some text"
                            }
                        }
                    ]
                },
                expectedError: {
                    type: "validation",
                    message: "Object not found: nonexistent_shape",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for batch updates",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    requests: [
                        {
                            createSlide: {
                                objectId: "slide_001"
                            }
                        }
                    ]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "permission",
                description: "User lacks edit permission on presentation",
                input: {
                    presentationId: "readonly-presentation-id",
                    requests: [
                        {
                            insertText: {
                                objectId: "shape_001",
                                insertionIndex: 0,
                                text: "Attempted edit"
                            }
                        }
                    ]
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to edit this presentation",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createPresentation",
        provider: "google-slides",
        validCases: [
            {
                name: "create_basic_presentation",
                description: "Create a new presentation with simple title",
                input: {
                    title: "Q4 2024 Sales Report"
                },
                expectedOutput: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    title: "Q4 2024 Sales Report",
                    presentationUrl:
                        "https://docs.google.com/presentation/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit",
                    revisionId: "rev_001",
                    slideCount: 1
                }
            },
            {
                name: "create_presentation_long_title",
                description: "Create presentation with longer descriptive title",
                input: {
                    title: "Annual Marketing Strategy Presentation - 2024 Fiscal Year Planning and Budget Allocation"
                },
                expectedOutput: {
                    presentationId: "2CyjNWt1YSB6oGNeEvF3vrqluVVrqumlct85PhwF3vont",
                    title: "Annual Marketing Strategy Presentation - 2024 Fiscal Year Planning and Budget Allocation",
                    presentationUrl:
                        "https://docs.google.com/presentation/d/2CyjNWt1YSB6oGNeEvF3vrqluVVrqumlct85PhwF3vont/edit",
                    revisionId: "rev_002",
                    slideCount: 1
                }
            },
            {
                name: "create_team_meeting_deck",
                description: "Create a team meeting presentation",
                input: {
                    title: "Weekly Engineering Sync - Sprint 24"
                },
                expectedOutput: {
                    presentationId: "3DzkOXu2ZTC7pHOfFwG4wsrmuWWsrvnmdv96QixG4wopv",
                    title: "Weekly Engineering Sync - Sprint 24",
                    presentationUrl:
                        "https://docs.google.com/presentation/d/3DzkOXu2ZTC7pHOfFwG4wsrmuWWsrvnmdv96QixG4wopv/edit",
                    revisionId: "rev_003",
                    slideCount: 1
                }
            },
            {
                name: "create_product_launch_deck",
                description: "Create a product launch presentation",
                input: {
                    title: "Product Launch: CloudSync Pro v3.0"
                },
                expectedOutput: {
                    presentationId: "4EalPYv3AUD8qIPgGxH5xtsnsXXtswonewo7RjyH5xpqw",
                    title: "Product Launch: CloudSync Pro v3.0",
                    presentationUrl:
                        "https://docs.google.com/presentation/d/4EalPYv3AUD8qIPgGxH5xtsnsXXtswonewo7RjyH5xpqw/edit",
                    revisionId: "rev_004",
                    slideCount: 1
                }
            }
        ],
        errorCases: [
            {
                name: "empty_title",
                description: "Title cannot be empty",
                input: {
                    title: ""
                },
                expectedError: {
                    type: "validation",
                    message: "Title must be at least 1 character",
                    retryable: false
                }
            },
            {
                name: "title_too_long",
                description: "Title exceeds maximum length",
                input: {
                    title: "A".repeat(300)
                },
                expectedError: {
                    type: "validation",
                    message: "Title must not exceed 256 characters",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for presentation creation",
                input: {
                    title: "Rate Limited Presentation"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "rate_limit",
                description: "Storage quota exceeded",
                input: {
                    title: "Quota Exceeded Presentation"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Google Drive storage quota exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deletePresentation",
        provider: "google-slides",
        validCases: [
            {
                name: "delete_presentation",
                description: "Delete a presentation (move to trash)",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                },
                expectedOutput: {
                    deleted: true,
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                }
            },
            {
                name: "delete_old_presentation",
                description: "Delete an older unused presentation",
                input: {
                    presentationId: "oldpres-xyz123abc456def"
                },
                expectedOutput: {
                    deleted: true,
                    presentationId: "oldpres-xyz123abc456def"
                }
            }
        ],
        errorCases: [
            {
                name: "presentation_not_found",
                description: "Presentation does not exist",
                input: {
                    presentationId: "nonexistent-pres-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Presentation not found",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "User lacks delete permission",
                input: {
                    presentationId: "shared-readonly-pres"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to delete this presentation",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
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
        operationId: "getPage",
        provider: "google-slides",
        validCases: [
            {
                name: "get_title_slide",
                description: "Retrieve the title slide of a presentation",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    pageObjectId: "p"
                },
                expectedOutput: {
                    objectId: "p",
                    pageType: "SLIDE",
                    pageElements: [
                        {
                            objectId: "title_text",
                            size: {
                                width: { magnitude: 720, unit: "PT" },
                                height: { magnitude: 60, unit: "PT" }
                            },
                            transform: {
                                scaleX: 1,
                                scaleY: 1,
                                translateX: 0,
                                translateY: 138,
                                unit: "PT"
                            },
                            shape: {
                                shapeType: "TEXT_BOX",
                                text: {
                                    textElements: [
                                        {
                                            textRun: {
                                                content: "Q4 2024 Sales Report\n"
                                            }
                                        }
                                    ]
                                }
                            }
                        },
                        {
                            objectId: "subtitle_text",
                            size: {
                                width: { magnitude: 720, unit: "PT" },
                                height: { magnitude: 40, unit: "PT" }
                            },
                            transform: {
                                scaleX: 1,
                                scaleY: 1,
                                translateX: 0,
                                translateY: 210,
                                unit: "PT"
                            },
                            shape: {
                                shapeType: "TEXT_BOX",
                                text: {
                                    textElements: [
                                        {
                                            textRun: {
                                                content: "Prepared by Sales Team\n"
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    ],
                    slideProperties: {
                        layoutObjectId: "TITLE_LAYOUT",
                        masterObjectId: "SIMPLE_LIGHT_MASTER"
                    },
                    pageProperties: {
                        pageBackgroundFill: {
                            solidFill: {
                                color: {
                                    rgbColor: {
                                        red: 1,
                                        green: 1,
                                        blue: 1
                                    }
                                }
                            }
                        }
                    },
                    elementCount: 2
                }
            },
            {
                name: "get_content_slide",
                description: "Retrieve a content slide with bullet points",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    pageObjectId: "slide_002"
                },
                expectedOutput: {
                    objectId: "slide_002",
                    pageType: "SLIDE",
                    pageElements: [
                        {
                            objectId: "slide_002_title",
                            shape: {
                                shapeType: "TEXT_BOX",
                                text: {
                                    textElements: [
                                        {
                                            textRun: {
                                                content: "Key Achievements\n"
                                            }
                                        }
                                    ]
                                }
                            }
                        },
                        {
                            objectId: "slide_002_body",
                            shape: {
                                shapeType: "TEXT_BOX",
                                text: {
                                    textElements: [
                                        {
                                            paragraphMarker: {
                                                bullet: { listId: "kix.list001" }
                                            }
                                        },
                                        {
                                            textRun: {
                                                content: "Revenue increased by 25% YoY\n"
                                            }
                                        },
                                        {
                                            paragraphMarker: {
                                                bullet: { listId: "kix.list001" }
                                            }
                                        },
                                        {
                                            textRun: {
                                                content: "Customer acquisition up 40%\n"
                                            }
                                        },
                                        {
                                            paragraphMarker: {
                                                bullet: { listId: "kix.list001" }
                                            }
                                        },
                                        {
                                            textRun: {
                                                content: "NPS score improved to 72\n"
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    ],
                    slideProperties: {
                        layoutObjectId: "TITLE_AND_BODY_LAYOUT",
                        masterObjectId: "SIMPLE_LIGHT_MASTER"
                    },
                    elementCount: 2
                }
            },
            {
                name: "get_slide_with_image",
                description: "Retrieve a slide containing an image",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    pageObjectId: "slide_chart_001"
                },
                expectedOutput: {
                    objectId: "slide_chart_001",
                    pageType: "SLIDE",
                    pageElements: [
                        {
                            objectId: "slide_chart_title",
                            shape: {
                                shapeType: "TEXT_BOX",
                                text: {
                                    textElements: [
                                        {
                                            textRun: {
                                                content: "Revenue Growth Chart\n"
                                            }
                                        }
                                    ]
                                }
                            }
                        },
                        {
                            objectId: "chart_image_001",
                            size: {
                                width: { magnitude: 600, unit: "PT" },
                                height: { magnitude: 350, unit: "PT" }
                            },
                            image: {
                                contentUrl: "https://lh3.googleusercontent.com/chart_abc123",
                                sourceUrl:
                                    "https://docs.google.com/spreadsheets/d/spreadsheet123/chart/1"
                            }
                        }
                    ],
                    slideProperties: {
                        layoutObjectId: "BLANK_LAYOUT",
                        masterObjectId: "SIMPLE_LIGHT_MASTER"
                    },
                    elementCount: 2
                }
            },
            {
                name: "get_master_page",
                description: "Retrieve a master page",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    pageObjectId: "SIMPLE_LIGHT_MASTER"
                },
                expectedOutput: {
                    objectId: "SIMPLE_LIGHT_MASTER",
                    pageType: "MASTER",
                    pageElements: [
                        {
                            objectId: "master_background",
                            shape: {
                                shapeType: "RECTANGLE"
                            }
                        }
                    ],
                    masterProperties: {
                        displayName: "Simple Light"
                    },
                    elementCount: 1
                }
            }
        ],
        errorCases: [
            {
                name: "presentation_not_found",
                description: "Presentation does not exist",
                input: {
                    presentationId: "nonexistent-pres-id",
                    pageObjectId: "p"
                },
                expectedError: {
                    type: "not_found",
                    message: "Presentation not found",
                    retryable: false
                }
            },
            {
                name: "page_not_found",
                description: "Page does not exist in presentation",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    pageObjectId: "nonexistent_page"
                },
                expectedError: {
                    type: "not_found",
                    message: "Page not found: nonexistent_page",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    pageObjectId: "p"
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
        operationId: "getPresentation",
        provider: "google-slides",
        validCases: [
            {
                name: "get_full_presentation",
                description: "Retrieve full presentation with all slides",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                },
                expectedOutput: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    title: "Q4 2024 Sales Report",
                    slides: [
                        {
                            objectId: "p",
                            pageType: "SLIDE",
                            slideProperties: {
                                layoutObjectId: "TITLE_LAYOUT",
                                masterObjectId: "SIMPLE_LIGHT_MASTER"
                            }
                        },
                        {
                            objectId: "slide_002",
                            pageType: "SLIDE",
                            slideProperties: {
                                layoutObjectId: "TITLE_AND_BODY_LAYOUT",
                                masterObjectId: "SIMPLE_LIGHT_MASTER"
                            }
                        },
                        {
                            objectId: "slide_003",
                            pageType: "SLIDE",
                            slideProperties: {
                                layoutObjectId: "SECTION_HEADER_LAYOUT",
                                masterObjectId: "SIMPLE_LIGHT_MASTER"
                            }
                        }
                    ],
                    masters: [
                        {
                            objectId: "SIMPLE_LIGHT_MASTER",
                            pageType: "MASTER",
                            masterProperties: {
                                displayName: "Simple Light"
                            }
                        }
                    ],
                    layouts: [
                        {
                            objectId: "TITLE_LAYOUT",
                            pageType: "LAYOUT",
                            layoutProperties: {
                                masterObjectId: "SIMPLE_LIGHT_MASTER",
                                name: "TITLE",
                                displayName: "Title slide"
                            }
                        },
                        {
                            objectId: "TITLE_AND_BODY_LAYOUT",
                            pageType: "LAYOUT",
                            layoutProperties: {
                                masterObjectId: "SIMPLE_LIGHT_MASTER",
                                name: "TITLE_AND_BODY",
                                displayName: "Title and body"
                            }
                        }
                    ],
                    pageSize: {
                        width: { magnitude: 720, unit: "PT" },
                        height: { magnitude: 405, unit: "PT" }
                    },
                    presentationUrl:
                        "https://docs.google.com/presentation/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit",
                    revisionId: "rev_abc123def456",
                    slideCount: 3
                }
            },
            {
                name: "get_single_slide_presentation",
                description: "Retrieve presentation with only one slide",
                input: {
                    presentationId: "2CyjNWt1YSB6oGNeEvF3vrqluVVrqumlct85PhwF3vont"
                },
                expectedOutput: {
                    presentationId: "2CyjNWt1YSB6oGNeEvF3vrqluVVrqumlct85PhwF3vont",
                    title: "Quick Draft Presentation",
                    slides: [
                        {
                            objectId: "p",
                            pageType: "SLIDE",
                            slideProperties: {
                                layoutObjectId: "BLANK_LAYOUT",
                                masterObjectId: "SIMPLE_LIGHT_MASTER"
                            }
                        }
                    ],
                    masters: [
                        {
                            objectId: "SIMPLE_LIGHT_MASTER",
                            pageType: "MASTER"
                        }
                    ],
                    layouts: [
                        {
                            objectId: "BLANK_LAYOUT",
                            pageType: "LAYOUT"
                        }
                    ],
                    pageSize: {
                        width: { magnitude: 720, unit: "PT" },
                        height: { magnitude: 405, unit: "PT" }
                    },
                    presentationUrl:
                        "https://docs.google.com/presentation/d/2CyjNWt1YSB6oGNeEvF3vrqluVVrqumlct85PhwF3vont/edit",
                    revisionId: "rev_xyz789",
                    slideCount: 1
                }
            },
            {
                name: "get_large_presentation",
                description: "Retrieve presentation with many slides",
                input: {
                    presentationId: "3DzkOXu2ZTC7pHOfFwG4wsrmuWWsrvnmdv96QixG4wopv"
                },
                expectedOutput: {
                    presentationId: "3DzkOXu2ZTC7pHOfFwG4wsrmuWWsrvnmdv96QixG4wopv",
                    title: "Comprehensive Training Manual",
                    slides: [
                        { objectId: "p", pageType: "SLIDE" },
                        { objectId: "slide_002", pageType: "SLIDE" },
                        { objectId: "slide_003", pageType: "SLIDE" },
                        { objectId: "slide_004", pageType: "SLIDE" },
                        { objectId: "slide_005", pageType: "SLIDE" },
                        { objectId: "slide_006", pageType: "SLIDE" },
                        { objectId: "slide_007", pageType: "SLIDE" },
                        { objectId: "slide_008", pageType: "SLIDE" },
                        { objectId: "slide_009", pageType: "SLIDE" },
                        { objectId: "slide_010", pageType: "SLIDE" },
                        { objectId: "slide_011", pageType: "SLIDE" },
                        { objectId: "slide_012", pageType: "SLIDE" }
                    ],
                    masters: [
                        {
                            objectId: "SIMPLE_DARK_MASTER",
                            pageType: "MASTER",
                            masterProperties: {
                                displayName: "Simple Dark"
                            }
                        }
                    ],
                    layouts: [
                        { objectId: "TITLE_LAYOUT", pageType: "LAYOUT" },
                        { objectId: "TITLE_AND_BODY_LAYOUT", pageType: "LAYOUT" },
                        { objectId: "BLANK_LAYOUT", pageType: "LAYOUT" }
                    ],
                    pageSize: {
                        width: { magnitude: 720, unit: "PT" },
                        height: { magnitude: 405, unit: "PT" }
                    },
                    presentationUrl:
                        "https://docs.google.com/presentation/d/3DzkOXu2ZTC7pHOfFwG4wsrmuWWsrvnmdv96QixG4wopv/edit",
                    revisionId: "rev_training_001",
                    slideCount: 12
                }
            },
            {
                name: "get_widescreen_presentation",
                description: "Retrieve presentation with widescreen aspect ratio",
                input: {
                    presentationId: "4EalPYv3AUD8qIPgGxH5xtsnsXXtswonewo7RjyH5xpqw"
                },
                expectedOutput: {
                    presentationId: "4EalPYv3AUD8qIPgGxH5xtsnsXXtswonewo7RjyH5xpqw",
                    title: "Product Demo Widescreen",
                    slides: [
                        { objectId: "p", pageType: "SLIDE" },
                        { objectId: "slide_features", pageType: "SLIDE" },
                        { objectId: "slide_demo", pageType: "SLIDE" }
                    ],
                    masters: [{ objectId: "STREAMLINE_MASTER", pageType: "MASTER" }],
                    layouts: [{ objectId: "TITLE_LAYOUT", pageType: "LAYOUT" }],
                    pageSize: {
                        width: { magnitude: 960, unit: "PT" },
                        height: { magnitude: 540, unit: "PT" }
                    },
                    presentationUrl:
                        "https://docs.google.com/presentation/d/4EalPYv3AUD8qIPgGxH5xtsnsXXtswonewo7RjyH5xpqw/edit",
                    revisionId: "rev_widescreen_001",
                    slideCount: 3
                }
            }
        ],
        errorCases: [
            {
                name: "presentation_not_found",
                description: "Presentation does not exist",
                input: {
                    presentationId: "nonexistent-presentation-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Presentation not found",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "User lacks access to presentation",
                input: {
                    presentationId: "private-pres-no-access"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to access this presentation",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
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
        operationId: "getThumbnail",
        provider: "google-slides",
        validCases: [
            {
                name: "get_thumbnail_large",
                description: "Get large thumbnail for a slide",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    pageObjectId: "p",
                    thumbnailSize: "LARGE"
                },
                expectedOutput: {
                    contentUrl:
                        "https://lh3.googleusercontent.com/slides/thumbnail/large/p_abc123def456",
                    width: 1600,
                    height: 900
                }
            },
            {
                name: "get_thumbnail_medium",
                description: "Get medium thumbnail for a slide",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    pageObjectId: "slide_002",
                    thumbnailSize: "MEDIUM"
                },
                expectedOutput: {
                    contentUrl:
                        "https://lh3.googleusercontent.com/slides/thumbnail/medium/slide002_xyz789",
                    width: 800,
                    height: 450
                }
            },
            {
                name: "get_thumbnail_small",
                description: "Get small thumbnail for a slide",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    pageObjectId: "slide_003",
                    thumbnailSize: "SMALL"
                },
                expectedOutput: {
                    contentUrl:
                        "https://lh3.googleusercontent.com/slides/thumbnail/small/slide003_qrs456",
                    width: 400,
                    height: 225
                }
            },
            {
                name: "get_thumbnail_default_size",
                description: "Get thumbnail with default size (no size specified)",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    pageObjectId: "slide_004"
                },
                expectedOutput: {
                    contentUrl:
                        "https://lh3.googleusercontent.com/slides/thumbnail/default/slide004_mno123",
                    width: 800,
                    height: 450
                }
            },
            {
                name: "get_thumbnail_widescreen_slide",
                description: "Get thumbnail for widescreen presentation slide",
                input: {
                    presentationId: "4EalPYv3AUD8qIPgGxH5xtsnsXXtswonewo7RjyH5xpqw",
                    pageObjectId: "slide_features",
                    thumbnailSize: "LARGE"
                },
                expectedOutput: {
                    contentUrl:
                        "https://lh3.googleusercontent.com/slides/thumbnail/large/features_wide_001",
                    width: 1920,
                    height: 1080
                }
            }
        ],
        errorCases: [
            {
                name: "presentation_not_found",
                description: "Presentation does not exist",
                input: {
                    presentationId: "nonexistent-pres-id",
                    pageObjectId: "p",
                    thumbnailSize: "LARGE"
                },
                expectedError: {
                    type: "not_found",
                    message: "Presentation not found",
                    retryable: false
                }
            },
            {
                name: "page_not_found",
                description: "Page does not exist in presentation",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    pageObjectId: "nonexistent_slide",
                    thumbnailSize: "MEDIUM"
                },
                expectedError: {
                    type: "not_found",
                    message: "Page not found: nonexistent_slide",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    pageObjectId: "p",
                    thumbnailSize: "LARGE"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "thumbnail_generation_failed",
                description: "Failed to generate thumbnail (server error)",
                input: {
                    presentationId: "corrupt-pres-id",
                    pageObjectId: "corrupt_slide"
                },
                expectedError: {
                    type: "server_error",
                    message: "Failed to generate thumbnail",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "moveToFolder",
        provider: "google-slides",
        validCases: [
            {
                name: "move_to_team_folder",
                description: "Move presentation to a shared team folder",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    folderId: "1ABC_SharedTeamFolder_XYZ"
                },
                expectedOutput: {
                    moved: true,
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    folderId: "1ABC_SharedTeamFolder_XYZ"
                }
            },
            {
                name: "move_to_project_folder",
                description: "Move presentation to project-specific folder",
                input: {
                    presentationId: "2CyjNWt1YSB6oGNeEvF3vrqluVVrqumlct85PhwF3vont",
                    folderId: "1DEF_Q4ProjectDocs_456"
                },
                expectedOutput: {
                    moved: true,
                    presentationId: "2CyjNWt1YSB6oGNeEvF3vrqluVVrqumlct85PhwF3vont",
                    folderId: "1DEF_Q4ProjectDocs_456"
                }
            },
            {
                name: "move_to_archive_folder",
                description: "Move old presentation to archive folder",
                input: {
                    presentationId: "3DzkOXu2ZTC7pHOfFwG4wsrmuWWsrvnmdv96QixG4wopv",
                    folderId: "1GHI_Archive2023_789"
                },
                expectedOutput: {
                    moved: true,
                    presentationId: "3DzkOXu2ZTC7pHOfFwG4wsrmuWWsrvnmdv96QixG4wopv",
                    folderId: "1GHI_Archive2023_789"
                }
            },
            {
                name: "move_to_root_folder",
                description: "Move presentation to My Drive root",
                input: {
                    presentationId: "4EalPYv3AUD8qIPgGxH5xtsnsXXtswonewo7RjyH5xpqw",
                    folderId: "root"
                },
                expectedOutput: {
                    moved: true,
                    presentationId: "4EalPYv3AUD8qIPgGxH5xtsnsXXtswonewo7RjyH5xpqw",
                    folderId: "root"
                }
            }
        ],
        errorCases: [
            {
                name: "presentation_not_found",
                description: "Presentation does not exist",
                input: {
                    presentationId: "nonexistent-pres-id",
                    folderId: "1ABC_SharedTeamFolder_XYZ"
                },
                expectedError: {
                    type: "not_found",
                    message: "Presentation not found",
                    retryable: false
                }
            },
            {
                name: "folder_not_found",
                description: "Destination folder does not exist",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    folderId: "nonexistent-folder-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Destination folder not found",
                    retryable: false
                }
            },
            {
                name: "permission_denied_presentation",
                description: "User lacks edit permission on presentation",
                input: {
                    presentationId: "readonly-shared-pres",
                    folderId: "1ABC_SharedTeamFolder_XYZ"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to move this presentation",
                    retryable: false
                }
            },
            {
                name: "permission_denied_folder",
                description: "User lacks write permission on destination folder",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    folderId: "readonly-folder-id"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to write to the destination folder",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    presentationId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    folderId: "1ABC_SharedTeamFolder_XYZ"
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
