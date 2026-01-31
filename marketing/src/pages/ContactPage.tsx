import { motion } from "framer-motion";
import { Mail, MessageSquare, MapPin, Clock } from "lucide-react";
import React from "react";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";

const contactMethods = [
    {
        icon: Mail,
        title: "Email Us",
        description: "For general inquiries and support",
        action: "hello@flowmaestro.ai",
        href: "mailto:hello@flowmaestro.ai"
    },
    {
        icon: MessageSquare,
        title: "Sales",
        description: "Talk to our sales team",
        action: "Schedule a call",
        href: "https://cal.com/naib-baghirov-o5surn/30min"
    }
];

export const ContactPage: React.FC = () => {
    const [formData, setFormData] = React.useState({
        name: "",
        email: "",
        company: "",
        message: ""
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // For now, just open mailto
        const subject = encodeURIComponent(`Contact from ${formData.name} at ${formData.company}`);
        const body = encodeURIComponent(formData.message);
        window.location.href = `mailto:hello@flowmaestro.ai?subject=${subject}&body=${body}`;
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navigation />

            {/* Hero Section */}
            <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8">
                <div className="absolute inset-0 grid-pattern opacity-50"></div>
                <div className="relative z-10 max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                            Get in <span className="gradient-text">Touch</span>
                        </h1>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            Have a question or want to learn more? We'd love to hear from you.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Contact Methods */}
            <section className="py-12 px-4 sm:px-6 lg:px-8 bg-background-surface">
                <div className="absolute inset-0 grid-pattern opacity-50"></div>
                <div className="relative z-10 max-w-4xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-6">
                        {contactMethods.map((method, index) => (
                            <motion.a
                                key={method.title}
                                href={method.href}
                                target={method.href.startsWith("http") ? "_blank" : undefined}
                                rel={
                                    method.href.startsWith("http")
                                        ? "noopener noreferrer"
                                        : undefined
                                }
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className="p-6 rounded-xl bg-background border border-stroke hover:border-primary-500/50 transition-all group"
                            >
                                <div className="w-12 h-12 rounded-lg bg-background-elevated border border-stroke flex items-center justify-center mb-4">
                                    <method.icon className="w-6 h-6 text-primary-400" />
                                </div>
                                <h3 className="text-lg font-semibold mb-1">{method.title}</h3>
                                <p className="text-sm text-gray-400 mb-3">{method.description}</p>
                                <span className="text-primary-400 group-hover:text-primary-300 text-sm">
                                    {method.action}
                                </span>
                            </motion.a>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact Form */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
                <div className="absolute inset-0 grid-pattern opacity-50"></div>
                <div className="relative z-10 max-w-2xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-2xl font-bold mb-6 text-center">Send us a message</h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                        className="w-full px-4 py-3 rounded-lg bg-background-surface border border-stroke focus:border-primary-500 focus:outline-none transition-colors text-white"
                                        placeholder="Your name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) =>
                                            setFormData({ ...formData, email: e.target.value })
                                        }
                                        className="w-full px-4 py-3 rounded-lg bg-background-surface border border-stroke focus:border-primary-500 focus:outline-none transition-colors text-white"
                                        placeholder="you@company.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Company
                                </label>
                                <input
                                    type="text"
                                    value={formData.company}
                                    onChange={(e) =>
                                        setFormData({ ...formData, company: e.target.value })
                                    }
                                    className="w-full px-4 py-3 rounded-lg bg-background-surface border border-stroke focus:border-primary-500 focus:outline-none transition-colors text-white"
                                    placeholder="Your company"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Message
                                </label>
                                <textarea
                                    required
                                    rows={5}
                                    value={formData.message}
                                    onChange={(e) =>
                                        setFormData({ ...formData, message: e.target.value })
                                    }
                                    className="w-full px-4 py-3 rounded-lg bg-background-surface border border-stroke focus:border-primary-500 focus:outline-none transition-colors text-white resize-none"
                                    placeholder="How can we help?"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 px-6 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors"
                            >
                                Send Message
                            </button>
                        </form>
                    </motion.div>
                </div>
            </section>

            {/* Office Info */}
            <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background-surface">
                <div className="absolute inset-0 grid-pattern opacity-50"></div>
                <div className="relative z-10 max-w-4xl mx-auto text-center">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-gray-400">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5" />
                            <span>San Francisco, CA</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            <span>Mon-Fri, 9am-6pm PST</span>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};
