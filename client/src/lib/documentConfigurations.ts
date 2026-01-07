// Document Type Configurations for Dynamic AI Document Generator
// Each document type has specific required fields

export interface DocumentField {
    name: string;
    label: string;
    type: 'text' | 'email' | 'number' | 'date' | 'textarea' | 'select';
    required: boolean;
    placeholder?: string;
    options?: string[]; // For select fields
}

export interface DocumentConfig {
    name: string;
    category: 'visa' | 'employment' | 'financial' | 'legal' | 'personal';
    fields: DocumentField[];
    description: string;
}

// Document configurations mapped by document type
export const DOCUMENT_CONFIGS: Record<string, DocumentConfig> = {
    'Bank Statement': {
        name: 'Bank Statement',
        category: 'financial',
        description: 'Official bank statement showing account balance and transactions',
        fields: [
            { name: 'fullName', label: 'Account Holder Name', type: 'text', required: true, placeholder: 'John Doe' },
            { name: 'bankName', label: 'Bank Name', type: 'text', required: true, placeholder: 'Chase Bank' },
            { name: 'accountNumber', label: 'Account Number', type: 'text', required: true, placeholder: '****1234' },
            { name: 'balance', label: 'Current Balance', type: 'number', required: true, placeholder: '50000' },
            { name: 'currency', label: 'Currency', type: 'select', required: true, options: ['USD', 'EUR', 'GBP', 'UZS'] },
            { name: 'startDate', label: 'Statement Start Date', type: 'date', required: true },
            { name: 'endDate', label: 'Statement End Date', type: 'date', required: true },
            { name: 'address', label: 'Bank Address', type: 'textarea', required: false },
        ]
    },

    'Employment Reference': {
        name: 'Employment Reference',
        category: 'employment',
        description: 'Letter from employer confirming employment details',
        fields: [
            { name: 'employeeName', label: 'Employee Full Name', type: 'text', required: true },
            { name: 'company', label: 'Company Name', type: 'text', required: true },
            { name: 'position', label: 'Job Title/Position', type: 'text', required: true },
            { name: 'startDate', label: 'Employment Start Date', type: 'date', required: true },
            { name: 'salary', label: 'Annual Salary', type: 'number', required: true },
            { name: 'currency', label: 'Currency', type: 'select', required: true, options: ['USD', 'EUR', 'GBP', 'UZS'] },
            { name: 'supervisor', label: 'Supervisor Name', type: 'text', required: false },
            { name: 'supervisorTitle', label: 'Supervisor Title', type: 'text', required: false },
            { name: 'companyAddress', label: 'Company Address', type: 'textarea', required: true },
            { name: 'responsibilities', label: 'Key Responsibilities', type: 'textarea', required: false },
        ]
    },

    'Motivation Letter': {
        name: 'Motivation Letter',
        category: 'visa',
        description: 'Letter explaining motivation for visa application',
        fields: [
            { name: 'fullName', label: 'Applicant Name', type: 'text', required: true },
            { name: 'visaType', label: 'Visa Type', type: 'select', required: true, options: ['Work Visa', 'Student Visa', 'Family Visa', 'Business Visa'] },
            { name: 'targetCountry', label: 'Target Country', type: 'select', required: true, options: ['United Kingdom', 'Germany', 'Poland', 'USA', 'Canada'] },
            { name: 'purpose', label: 'Purpose of Application', type: 'textarea', required: true, placeholder: 'Describe your reason for applying...' },
            { name: 'background', label: 'Educational/Professional Background', type: 'textarea', required: true },
            { name: 'achievements', label: 'Key Achievements', type: 'textarea', required: false },
            { name: 'futurePlans', label: 'Future Plans', type: 'textarea', required: false },
        ]
    },

    'Visa Application Form': {
        name: 'Visa Application Form',
        category: 'visa',
        description: 'Complete visa application form',
        fields: [
            { name: 'fullName', label: 'Full Name', type: 'text', required: true },
            { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true },
            { name: 'nationality', label: 'Nationality', type: 'text', required: true },
            { name: 'passportNumber', label: 'Passport Number', type: 'text', required: true },
            { name: 'visaType', label: 'Visa Type', type: 'select', required: true, options: ['Work', 'Student', 'Tourist', 'Family', 'Business'] },
            { name: 'targetCountry', label: 'Destination Country', type: 'select', required: true, options: ['UK', 'Germany', 'Poland', 'USA', 'Canada'] },
            { name: 'durationOfStay', label: 'Intended Duration (months)', type: 'number', required: true },
            { name: 'purposeOfVisit', label: 'Purpose of Visit', type: 'textarea', required: true },
            { name: 'currentAddress', label: 'Current Address', type: 'textarea', required: true },
            { name: 'phoneNumber', label: 'Phone Number', type: 'text', required: true },
            { name: 'email', label: 'Email Address', type: 'email', required: true },
        ]
    },

    'Cover Letter': {
        name: 'Cover Letter',
        category: 'employment',
        description: 'Professional cover letter for job applications',
        fields: [
            { name: 'fullName', label: 'Your Full Name', type: 'text', required: true },
            { name: 'email', label: 'Email Address', type: 'email', required: true },
            { name: 'phone', label: 'Phone Number', type: 'text', required: true },
            { name: 'address', label: 'Your Address', type: 'text', required: false },
            { name: 'companyName', label: 'Company Name', type: 'text', required: true },
            { name: 'position', label: 'Position Applied For', type: 'text', required: true },
            { name: 'experience', label: 'Years of Experience', type: 'number', required: true },
            { name: 'skills', label: 'Relevant Skills', type: 'textarea', required: true },
            { name: 'whyCompany', label: 'Why This Company?', type: 'textarea', required: true },
        ]
    },

    'Proof of Funds': {
        name: 'Proof of Funds',
        category: 'financial',
        description: 'Document proving sufficient financial resources',
        fields: [
            { name: 'fullName', label: 'Full Name', type: 'text', required: true },
            { name: 'totalFunds', label: 'Total Available Funds', type: 'number', required: true },
            { name: 'currency', label: 'Currency', type: 'select', required: true, options: ['USD', 'EUR', 'GBP', 'UZS'] },
            { name: 'sourceOfFunds', label: 'Source of Funds', type: 'textarea', required: true, placeholder: 'Savings, employment, investments, etc.' },
            { name: 'bankName', label: 'Primary Bank', type: 'text', required: true },
            { name: 'accountType', label: 'Account Type', type: 'select', required: true, options: ['Savings', 'Checking', 'Investment', 'Business'] },
            { name: 'statementDate', label: 'Statement Date', type: 'date', required: true },
        ]
    },

    // Lawyer-specific document types
    'Legal Opinion': {
        name: 'Legal Opinion',
        category: 'legal',
        description: 'Professional legal opinion on immigration case',
        fields: [
            { name: 'lawyerName', label: 'Lawyer Name', type: 'text', required: true },
            { name: 'licenseNumber', label: 'License Number', type: 'text', required: true },
            { name: 'clientName', label: 'Client Name', type: 'text', required: true },
            { name: 'caseType', label: 'Case Type', type: 'select', required: true, options: ['Visa Application', 'Appeal', 'Deportation Defense', 'Family Reunion'] },
            { name: 'legalIssue', label: 'Legal Issue/Question', type: 'textarea', required: true },
            { name: 'analysis', label: 'Legal Analysis', type: 'textarea', required: true },
            { name: 'conclusion', label: 'Conclusion/Recommendation', type: 'textarea', required: true },
            { name: 'precedents', label: 'Relevant Case Law/Precedents', type: 'textarea', required: false },
        ]
    },

    'Power of Attorney': {
        name: 'Power of Attorney',
        category: 'legal',
        description: 'Legal authorization to act on behalf of client',
        fields: [
            { name: 'principalName', label: 'Principal (Client) Name', type: 'text', required: true },
            { name: 'agentName', label: 'Agent (Lawyer) Name', type: 'text', required: true },
            { name: 'agentLicense', label: 'Agent License Number', type: 'text', required: true },
            { name: 'scopeOfAuthority', label: 'Scope of Authority', type: 'textarea', required: true, placeholder: 'Specific powers granted...' },
            { name: 'effectiveDate', label: 'Effective Date', type: 'date', required: true },
            { name: 'expirationDate', label: 'Expiration Date', type: 'date', required: false },
            { name: 'witnessName', label: 'Witness Name', type: 'text', required: false },
        ]
    },

    'Case Summary': {
        name: 'Case Summary',
        category: 'legal',
        description: 'Summary of immigration case details',
        fields: [
            { name: 'caseNumber', label: 'Case Number', type: 'text', required: true },
            { name: 'clientName', label: 'Client Name', type: 'text', required: true },
            { name: 'caseType', label: 'Case Type', type: 'select', required: true, options: ['Visa Application', 'Appeal', 'Asylum', 'Family Petition'] },
            { name: 'filingDate', label: 'Filing Date', type: 'date', required: true },
            { name: 'currentStatus', label: 'Current Status', type: 'text', required: true },
            { name: 'background', label: 'Case Background', type: 'textarea', required: true },
            { name: 'timeline', label: 'Key Timeline Events', type: 'textarea', required: true },
            { name: 'nextSteps', label: 'Next Steps', type: 'textarea', required: true },
        ]
    },
};

// Helper function to get fields for a specific document type
export function getDocumentFields(documentType: string): DocumentField[] {
    const config = DOCUMENT_CONFIGS[documentType];
    return config ? config.fields : [];
}

// Helper function to get all document types for a category
export function getDocumentTypesByCategory(category: string): string[] {
    return Object.keys(DOCUMENT_CONFIGS).filter(
        key => DOCUMENT_CONFIGS[key].category === category
    );
}

// Helper function to check if document is lawyer-only
export function isLawyerOnlyDocument(documentType: string): boolean {
    const lawyerOnlyCategories = ['legal'];
    const config = DOCUMENT_CONFIGS[documentType];
    return config ? lawyerOnlyCategories.includes(config.category) : false;
}

// Get all available document types
export function getAllDocumentTypes(): string[] {
    return Object.keys(DOCUMENT_CONFIGS);
}

// Get document types filtered by user role
export function getDocumentTypesForRole(role: 'client' | 'lawyer' | 'admin'): string[] {
    if (role === 'admin' || role === 'lawyer') {
        return getAllDocumentTypes();
    }
    // Clients can't access lawyer-specific documents
    return getAllDocumentTypes().filter(type => !isLawyerOnlyDocument(type));
}
