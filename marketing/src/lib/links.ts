/** External destinations shared across the site. The marketing site deploys on its own, so every
 *  call to action books a demo instead of linking to the app. */
export const BOOK_DEMO_URL: string =
    import.meta.env.VITE_BOOK_DEMO_URL || "https://cal.com/naib-baghirov-o5surn/30min";
