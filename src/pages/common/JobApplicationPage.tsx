import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, MapPin, Briefcase, ShieldCheck } from 'lucide-react';
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { careersService, JobPosition } from '../../lib/careersService';

export default function JobApplicationPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [position, setPosition] = useState<JobPosition | null>(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [appId, setAppId] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Step 1: Personal & Contact Details
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [cityArea, setCityArea] = useState('');
    const [noticePeriod, setNoticePeriod] = useState('Immediate');

    // Step 2: Experience & Credentials
    const [yearsExperience, setYearsExperience] = useState('3-5 years');
    const [educationLevel, setEducationLevel] = useState("Bachelor's Degree");
    const [currentCompany, setCurrentCompany] = useState('');
    const [currentTitle, setCurrentTitle] = useState('');
    const [resumeLink, setResumeLink] = useState('');
    const [linkedinUrl, setLinkedinUrl] = useState('');

    // Step 3: Role Competencies & Scenario
    const [scenarioAnswer, setScenarioAnswer] = useState('');
    const [whyMuncheez, setWhyMuncheez] = useState('');

    // Step 4: Compensation & Final Consent
    const [expectedSalary, setExpectedSalary] = useState('');
    const [interviewAvailability, setInterviewAvailability] = useState('Flexible (In-person or Virtual)');
    const [consentChecked, setConsentChecked] = useState(false);

    useEffect(() => {
        const loadPosition = async () => {
            const positions = await careersService.getPositions();
            if (id) {
                const found = positions.find(p => p.id === id || p.title.toLowerCase().replace(/\s+/g, '-') === id.toLowerCase());
                if (found) {
                    setPosition(found);
                    return;
                }
            }
            if (positions.length > 0) {
                setPosition(positions[0]);
            }
        };
        loadPosition();
    }, [id]);

    const handleNextStep = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');

        if (currentStep === 1) {
            if (!fullName.trim() || !email.trim() || !phone.trim() || !cityArea.trim()) {
                setErrorMessage('Please fill in all required personal contact details.');
                return;
            }
        } else if (currentStep === 2) {
            if (!resumeLink.trim()) {
                setErrorMessage('Please provide a link to your CV or Resume.');
                return;
            }
        } else if (currentStep === 3) {
            if (!scenarioAnswer.trim()) {
                setErrorMessage('Please complete the executive scenario response.');
                return;
            }
        }

        setCurrentStep(prev => prev + 1);
        window.scrollTo({ top: 120, behavior: 'smooth' });
    };

    const handlePreviousStep = () => {
        setErrorMessage('');
        setCurrentStep(prev => Math.max(1, prev - 1));
        window.scrollTo({ top: 120, behavior: 'smooth' });
    };

    const handleFinalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');

        if (!consentChecked) {
            setErrorMessage('Please confirm accuracy of your submitted information.');
            return;
        }

        setIsSubmitting(true);
        try {
            const saved = await careersService.submitApplication({
                position_title: position?.title || 'Executive Assistant',
                full_name: fullName.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim(),
                city_area: cityArea.trim(),
                notice_period: noticePeriod,
                years_experience: yearsExperience,
                education_level: educationLevel,
                current_company: currentCompany.trim(),
                current_title: currentTitle.trim(),
                resume_link: resumeLink.trim(),
                linkedin_url: linkedinUrl.trim(),
                scenario_answer: scenarioAnswer.trim(),
                why_muncheez: whyMuncheez.trim(),
                expected_salary: expectedSalary.trim(),
                cover_note: `Notice: ${noticePeriod} | Area: ${cityArea} | Expected: ${expectedSalary} | Scenario: ${scenarioAnswer.substring(0, 100)}...`
            });

            setAppId(saved.id.slice(-6).toUpperCase());
            setIsSubmitted(true);
            window.scrollTo({ top: 120, behavior: 'smooth' });
        } catch (err) {
            console.error('Submission error:', err);
            setErrorMessage('Submission failed. Please check network and try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const STEPS = [
        { num: 1, label: 'Contact Details' },
        { num: 2, label: 'Experience & CV' },
        { num: 3, label: 'Role Scenarios' },
        { num: 4, label: 'Review & Submit' }
    ];

    return (
        <div className="min-h-screen bg-[#4A90E2] text-white font-sans selection:bg-white selection:text-[#4A90E2] flex flex-col justify-between overflow-x-hidden">
            <div>
                <Navbar />

                {/* Header with Navigation */}
                <header className="pt-32 pb-8 md:pt-40 md:pb-10 border-b border-white/20">
                    <div className="container max-w-4xl mx-auto px-6">
                        <Link
                            to="/careers"
                            className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-white/80 hover:text-white mb-6 border-b border-white/30 pb-0.5"
                        >
                            <ArrowLeft size={13} /> Back to Open Positions
                        </Link>

                        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                            <div>
                                <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/70 block mb-1">
                                    Official Hiring Application
                                </span>
                                <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white">
                                    {position ? position.title : 'Executive Assistant'}
                                </h1>
                            </div>
                            <span className="text-xs font-mono text-white/80 flex items-center gap-1">
                                <MapPin size={12} /> Nairobi, Kenya &bull; Full-time
                            </span>
                        </div>

                        {/* Progress Stepper */}
                        {!isSubmitted && (
                            <div className="grid grid-cols-4 gap-2 sm:gap-4 mt-8 pt-6 border-t border-white/10">
                                {STEPS.map((s) => (
                                    <div key={s.num} className="space-y-1.5">
                                        <div
                                            className={`h-1 w-full transition-colors ${
                                                s.num <= currentStep ? 'bg-white' : 'bg-white/20'
                                            }`}
                                        />
                                        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider">
                                            <span className={s.num === currentStep ? 'text-white font-bold' : 'text-white/60'}>
                                                0{s.num}. {s.label}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </header>

                {/* Main Form Process Area */}
                <main className="container max-w-4xl mx-auto px-6 py-12 pb-28">
                    {errorMessage && (
                        <div className="mb-8 p-3 bg-red-500/20 border border-red-300 text-white text-xs font-mono">
                            {errorMessage}
                        </div>
                    )}

                    {isSubmitted ? (
                        /* SUCCESS SCREEN */
                        <div className="py-16 text-center space-y-6 border-b border-white/20">
                            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-400 text-black flex items-center justify-center font-bold">
                                <Check size={32} />
                            </div>
                            <div className="space-y-2">
                                <span className="text-xs font-mono uppercase tracking-widest text-white/70 block">
                                    Application Confirmed &bull; Ref: MUNCH-{appId}
                                </span>
                                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-white">
                                    Application Submitted
                                </h2>
                                <p className="text-white/85 text-base max-w-lg mx-auto font-light leading-relaxed">
                                    Thank you, {fullName}. Your application for the <strong>{position?.title}</strong> role has been registered directly into our recruitment pipeline in Nairobi.
                                </p>
                            </div>

                            <div className="max-w-md mx-auto py-6 border-t border-b border-white/10 text-left text-xs font-mono space-y-2 text-white/80">
                                <p>&bull; Applicant: {fullName}</p>
                                <p>&bull; Email: {email}</p>
                                <p>&bull; Phone: {phone}</p>
                                <p>&bull; Position: {position?.title}</p>
                                <p>&bull; Next Steps: Candidates matching qualifications are contacted within 5 business days for interview scheduling.</p>
                            </div>

                            <div className="pt-4">
                                <Link
                                    to="/careers"
                                    className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-white border-b-2 border-white pb-1 hover:text-[#D4AF37] hover:border-[#D4AF37] transition-colors"
                                >
                                    Return to Careers Directory <ArrowRight size={14} />
                                </Link>
                            </div>
                        </div>
                    ) : (
                        /* MULTI-STEP APPLICATION FORM */
                        <div className="space-y-8">
                            {/* STEP 1: Personal Contact Details */}
                            {currentStep === 1 && (
                                <form onSubmit={handleNextStep} className="space-y-8">
                                    <div className="border-b border-white/10 pb-4">
                                        <h2 className="text-xl font-heading font-bold text-white">Step 1: Contact Information</h2>
                                        <p className="text-xs text-white/70 font-mono mt-1">Provide your primary contact channels in Nairobi.</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                        <div>
                                            <label className="text-[10px] font-mono uppercase tracking-wider text-white/80 block mb-2">
                                                Full Legal Name *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                placeholder="e.g. Amani Wanjiru Kamau"
                                                className="w-full bg-transparent border-b border-white/30 pb-2 text-base text-white focus:outline-none focus:border-white placeholder:text-white/30"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-mono uppercase tracking-wider text-white/80 block mb-2">
                                                Email Address *
                                            </label>
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="amani@example.com"
                                                className="w-full bg-transparent border-b border-white/30 pb-2 text-base text-white focus:outline-none focus:border-white placeholder:text-white/30"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                        <div>
                                            <label className="text-[10px] font-mono uppercase tracking-wider text-white/80 block mb-2">
                                                Phone / WhatsApp Number *
                                            </label>
                                            <input
                                                type="tel"
                                                required
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="+254 700 000 000"
                                                className="w-full bg-transparent border-b border-white/30 pb-2 text-base text-white focus:outline-none focus:border-white placeholder:text-white/30"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-mono uppercase tracking-wider text-white/80 block mb-2">
                                                Residential Area / Suburb in Nairobi *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={cityArea}
                                                onChange={(e) => setCityArea(e.target.value)}
                                                placeholder="e.g. Westlands, Kilimani, Karen, CBD..."
                                                className="w-full bg-transparent border-b border-white/30 pb-2 text-base text-white focus:outline-none focus:border-white placeholder:text-white/30"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-mono uppercase tracking-wider text-white/80 block mb-2">
                                            Earliest Availability / Notice Period *
                                        </label>
                                        <select
                                            value={noticePeriod}
                                            onChange={(e) => setNoticePeriod(e.target.value)}
                                            className="w-full bg-transparent border-b border-white/30 pb-2 text-base text-white focus:outline-none focus:border-white cursor-pointer"
                                        >
                                            <option value="Immediate" className="bg-[#121214] text-white">Immediate (Ready to start)</option>
                                            <option value="1 Week" className="bg-[#121214] text-white">1 Week Notice</option>
                                            <option value="2 Weeks" className="bg-[#121214] text-white">2 Weeks Notice</option>
                                            <option value="1 Month" className="bg-[#121214] text-white">1 Month Notice</option>
                                        </select>
                                    </div>

                                    <div className="pt-6 flex justify-end">
                                        <button
                                            type="submit"
                                            className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-white border-b-2 border-white pb-1 hover:text-[#D4AF37] hover:border-[#D4AF37] transition-colors cursor-pointer"
                                        >
                                            Continue to Experience & CV <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* STEP 2: Experience & Credentials */}
                            {currentStep === 2 && (
                                <form onSubmit={handleNextStep} className="space-y-8">
                                    <div className="border-b border-white/10 pb-4">
                                        <h2 className="text-xl font-heading font-bold text-white">Step 2: Experience & Qualifications</h2>
                                        <p className="text-xs text-white/70 font-mono mt-1">Detail your professional background and link your resume.</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                        <div>
                                            <label className="text-[10px] font-mono uppercase tracking-wider text-white/80 block mb-2">
                                                Years of Executive / Administrative Experience *
                                            </label>
                                            <select
                                                value={yearsExperience}
                                                onChange={(e) => setYearsExperience(e.target.value)}
                                                className="w-full bg-transparent border-b border-white/30 pb-2 text-base text-white focus:outline-none focus:border-white cursor-pointer"
                                            >
                                                <option value="1-2 years" className="bg-[#121214] text-white">1-2 years</option>
                                                <option value="3-5 years" className="bg-[#121214] text-white">3-5 years</option>
                                                <option value="6-8 years" className="bg-[#121214] text-white">6-8 years</option>
                                                <option value="9+ years" className="bg-[#121214] text-white">9+ years</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-mono uppercase tracking-wider text-white/80 block mb-2">
                                                Highest Level of Education
                                            </label>
                                            <select
                                                value={educationLevel}
                                                onChange={(e) => setEducationLevel(e.target.value)}
                                                className="w-full bg-transparent border-b border-white/30 pb-2 text-base text-white focus:outline-none focus:border-white cursor-pointer"
                                            >
                                                <option value="Bachelor's Degree" className="bg-[#121214] text-white">Bachelor's Degree</option>
                                                <option value="Diploma / Higher Diploma" className="bg-[#121214] text-white">Diploma / Higher Diploma</option>
                                                <option value="Master's Degree" className="bg-[#121214] text-white">Master's Degree</option>
                                                <option value="Professional Certification" className="bg-[#121214] text-white">Professional Certification</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                        <div>
                                            <label className="text-[10px] font-mono uppercase tracking-wider text-white/80 block mb-2">
                                                Current or Most Recent Employer
                                            </label>
                                            <input
                                                type="text"
                                                value={currentCompany}
                                                onChange={(e) => setCurrentCompany(e.target.value)}
                                                placeholder="Company name"
                                                className="w-full bg-transparent border-b border-white/30 pb-2 text-base text-white focus:outline-none focus:border-white placeholder:text-white/30"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-mono uppercase tracking-wider text-white/80 block mb-2">
                                                Current or Most Recent Job Title
                                            </label>
                                            <input
                                                type="text"
                                                value={currentTitle}
                                                onChange={(e) => setCurrentTitle(e.target.value)}
                                                placeholder="e.g. Executive Assistant, Office Manager"
                                                className="w-full bg-transparent border-b border-white/30 pb-2 text-base text-white focus:outline-none focus:border-white placeholder:text-white/30"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                        <div>
                                            <label className="text-[10px] font-mono uppercase tracking-wider text-white/80 block mb-2">
                                                Link to CV / Resume (Google Drive, Dropbox, PDF) *
                                            </label>
                                            <input
                                                type="url"
                                                required
                                                value={resumeLink}
                                                onChange={(e) => setResumeLink(e.target.value)}
                                                placeholder="https://drive.google.com/... or dropbox link"
                                                className="w-full bg-transparent border-b border-white/30 pb-2 text-base text-white focus:outline-none focus:border-white placeholder:text-white/30"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-mono uppercase tracking-wider text-white/80 block mb-2">
                                                LinkedIn Profile URL
                                            </label>
                                            <input
                                                type="url"
                                                value={linkedinUrl}
                                                onChange={(e) => setLinkedinUrl(e.target.value)}
                                                placeholder="https://linkedin.com/in/..."
                                                className="w-full bg-transparent border-b border-white/30 pb-2 text-base text-white focus:outline-none focus:border-white placeholder:text-white/30"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-6 flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={handlePreviousStep}
                                            className="text-xs font-mono uppercase tracking-wider text-white/70 hover:text-white border-b border-white/30 pb-1 cursor-pointer"
                                        >
                                            &larr; Back
                                        </button>
                                        <button
                                            type="submit"
                                            className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-white border-b-2 border-white pb-1 hover:text-[#D4AF37] hover:border-[#D4AF37] transition-colors cursor-pointer"
                                        >
                                            Continue to Scenarios <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* STEP 3: Role Scenarios & Competencies */}
                            {currentStep === 3 && (
                                <form onSubmit={handleNextStep} className="space-y-8">
                                    <div className="border-b border-white/10 pb-4">
                                        <h2 className="text-xl font-heading font-bold text-white">Step 3: Executive Scenarios & Fit</h2>
                                        <p className="text-xs text-white/70 font-mono mt-1">Demonstrate your problem-solving and operational communication.</p>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-mono uppercase tracking-wider text-white/80 block mb-2">
                                            Scenario Prompt: Conflicting Executive Priorities *
                                        </label>
                                        <p className="text-xs text-white/70 mb-3">
                                            Describe a scenario where executive calendars overlapped, urgent cross-functional issues arose simultaneously, and how you resolved them without compromising delivery.
                                        </p>
                                        <textarea
                                            rows={4}
                                            required
                                            value={scenarioAnswer}
                                            onChange={(e) => setScenarioAnswer(e.target.value)}
                                            placeholder="Write your response clearly..."
                                            className="w-full bg-transparent border-b border-white/30 pb-2 text-sm text-white focus:outline-none focus:border-white placeholder:text-white/30 resize-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-mono uppercase tracking-wider text-white/80 block mb-2">
                                            Why Muncheez Technologies?
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={whyMuncheez}
                                            onChange={(e) => setWhyMuncheez(e.target.value)}
                                            placeholder="What attracts you to joining our urban logistics operations in Nairobi?"
                                            className="w-full bg-transparent border-b border-white/30 pb-2 text-sm text-white focus:outline-none focus:border-white placeholder:text-white/30 resize-none"
                                        />
                                    </div>

                                    <div className="pt-6 flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={handlePreviousStep}
                                            className="text-xs font-mono uppercase tracking-wider text-white/70 hover:text-white border-b border-white/30 pb-1 cursor-pointer"
                                        >
                                            &larr; Back
                                        </button>
                                        <button
                                            type="submit"
                                            className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-white border-b-2 border-white pb-1 hover:text-[#D4AF37] hover:border-[#D4AF37] transition-colors cursor-pointer"
                                        >
                                            Continue to Final Review <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* STEP 4: Review, Compensation & Submission */}
                            {currentStep === 4 && (
                                <form onSubmit={handleFinalSubmit} className="space-y-8">
                                    <div className="border-b border-white/10 pb-4">
                                        <h2 className="text-xl font-heading font-bold text-white">Step 4: Compensation & Final Review</h2>
                                        <p className="text-xs text-white/70 font-mono mt-1">Confirm details and submit your application for review.</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                        <div>
                                            <label className="text-[10px] font-mono uppercase tracking-wider text-white/80 block mb-2">
                                                Expected Monthly Net Compensation (KES)
                                            </label>
                                            <input
                                                type="text"
                                                value={expectedSalary}
                                                onChange={(e) => setExpectedSalary(e.target.value)}
                                                placeholder="e.g. KES 120,000 - 160,000"
                                                className="w-full bg-transparent border-b border-white/30 pb-2 text-base text-white focus:outline-none focus:border-white placeholder:text-white/30"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-mono uppercase tracking-wider text-white/80 block mb-2">
                                                Interview Availability in Nairobi
                                            </label>
                                            <select
                                                value={interviewAvailability}
                                                onChange={(e) => setInterviewAvailability(e.target.value)}
                                                className="w-full bg-transparent border-b border-white/30 pb-2 text-base text-white focus:outline-none focus:border-white cursor-pointer"
                                            >
                                                <option value="Flexible (In-person or Virtual)" className="bg-[#121214] text-white">Flexible (In-person or Virtual)</option>
                                                <option value="In-person (Westlands/Nairobi)" className="bg-[#121214] text-white">In-person (Westlands/Nairobi)</option>
                                                <option value="Virtual First" className="bg-[#121214] text-white">Virtual First</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Application Summary Box */}
                                    <div className="border-t border-b border-white/10 py-4 text-xs font-mono space-y-1 text-white/80">
                                        <p>&bull; Candidate: <strong>{fullName}</strong> ({email} / {phone})</p>
                                        <p>&bull; Role: <strong>{position?.title}</strong> &bull; Location: {cityArea}, Nairobi</p>
                                        <p>&bull; Experience: {yearsExperience} &bull; Notice: {noticePeriod}</p>
                                        <p>&bull; CV Link: {resumeLink}</p>
                                    </div>

                                    <div className="flex items-start gap-3 pt-2">
                                        <input
                                            type="checkbox"
                                            id="consent"
                                            required
                                            checked={consentChecked}
                                            onChange={(e) => setConsentChecked(e.target.checked)}
                                            className="mt-1 w-4 h-4 cursor-pointer"
                                        />
                                        <label htmlFor="consent" className="text-xs text-white/85 cursor-pointer">
                                            I confirm that the information provided in this application is accurate and complete. I understand that Muncheez Technologies Ltd. will verify provided credentials and references.
                                        </label>
                                    </div>

                                    <div className="pt-6 flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={handlePreviousStep}
                                            className="text-xs font-mono uppercase tracking-wider text-white/70 hover:text-white border-b border-white/30 pb-1 cursor-pointer"
                                        >
                                            &larr; Back
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-white border-b-2 border-white pb-1.5 hover:text-[#D4AF37] hover:border-[#D4AF37] transition-colors cursor-pointer disabled:opacity-50"
                                        >
                                            {isSubmitting ? 'Submitting Application...' : 'Submit Official Application'}
                                            <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </main>
            </div>

            {/* Footer */}
            <Footer />
        </div>
    );
}
