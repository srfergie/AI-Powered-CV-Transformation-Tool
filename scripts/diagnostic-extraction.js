/**
 * Diagnostic script to test AI extraction quality
 */

const { processResumeWithOpenRouter } = require('../src/services/openRouterService');

// Sample CV text that should extract comprehensive information
const sampleCVText = `
KATIE CASTELINO BIGMORE
katiebigmore@gmail.com, +44 (0)7789248819, United Kingdom

PROFILE
Katie is an expert in Monitoring, Evaluation, Research and Learning (MERL). She has extensive experience making the links between disciplines, connecting climate change and health. Deep sector knowledge of health, food and water security and broader specialism on gender, livelihoods, resilience, risks and crisis response. 

Katie is an experienced leader of assessments, evaluations and reviews, with excellent stakeholder engagement skills. She is a provider of trusted evidence and insights for adaptive programming and strategic decision-making. Katie has worked across multiple contexts from humanitarian emergencies to development programmes.

She has expertise in mixed methods research design and implementation. Katie specializes in participatory and inclusive approaches, ensuring marginalized voices are heard. She has particular expertise in climate-smart agriculture and climate resilience.

WORK EXPERIENCE

Senior Monitoring, Evaluation and Learning Adviser
FCDO | 2021 - Present | London, UK
Leading strategic MERL frameworks for climate resilience programmes across Sub-Saharan Africa. Responsible for designing and implementing comprehensive evaluation systems for £50M+ programmes. Managing relationships with key stakeholders including government partners, implementing organizations and donor communities.

• Developed innovative MERL approaches integrating climate vulnerability assessments
• Led evaluations of 15+ climate adaptation projects across 8 countries
• Established monitoring systems tracking outcomes for 500,000+ beneficiaries
• Managed evaluation budgets exceeding £2M annually

Research and Evaluation Consultant  
Independent | 2019 - 2021 | Various locations
Provided specialized MERL services to international development organizations. Led baseline studies, mid-term reviews and impact evaluations for programmes focused on climate adaptation and food security.

• Conducted evaluations for UN agencies, INGOs and bilateral donors
• Designed data collection systems for remote and challenging contexts
• Published evaluation reports influencing programme design and funding decisions
• Trained local evaluation teams in participatory methodologies

EDUCATION

MSc Development Studies (Distinction)
London School of Economics | 2018
Dissertation: "Climate Change Adaptation in Smallholder Agriculture: Evidence from East Africa"

BSc Environmental Science (First Class Honours)
University of Cambridge | 2016

PUBLICATIONS

Castelino Bigmore, K., Smith, J., & Ahmed, R. (2023). "Climate-Smart Agriculture Adoption Among Smallholder Farmers: A Mixed Methods Evaluation." Journal of Development Studies, 59(4), 123-145.

Castelino Bigmore, K. (2022). "Participatory Approaches to Climate Vulnerability Assessment: Lessons from Sub-Saharan Africa." Evaluation and Program Planning, 91, 102-115.

Smith, J., Castelino Bigmore, K., & Wilson, M. (2021). "Gender Dimensions of Climate Resilience Programming: An Evaluation Framework." Development Policy Review, 39(3), 456-472.
`;

console.log('🔍 DIAGNOSTIC: Testing AI Extraction Quality');
console.log('===========================================');

async function runDiagnostic() {
    try {
        console.log('📄 Testing with comprehensive CV sample...');
        console.log('Expected extractions:');
        console.log('  • Full name: Katie Castelino Bigmore');
        console.log('  • Complete profile: 3+ paragraphs about MERL expertise');
        console.log('  • Work experience: 2 detailed roles with bullet points');
        console.log('  • Education: 2 degrees with distinctions');
        console.log('  • Publications: 3 academic publications');
        console.log('');

        const result = await processResumeWithOpenRouter(sampleCVText);

        console.log('✅ AI EXTRACTION RESULTS:');
        console.log('========================');

        // Test personal info extraction
        console.log('👤 PERSONAL INFO:');
        console.log(`   Name: ${result.personalInfo?.name || 'NOT EXTRACTED'}`);
        console.log(`   Email: ${result.personalInfo?.email || 'NOT EXTRACTED'}`);
        console.log(`   Phone: ${result.personalInfo?.phone || 'NOT EXTRACTED'}`);
        console.log(`   Nationality: ${result.personalInfo?.nationality || 'NOT EXTRACTED'}`);

        // Test profile extraction  
        console.log('');
        console.log('📋 PROFILE/SUMMARY:');
        const summaryLength = result.summary?.length || 0;
        console.log(`   Length: ${summaryLength} characters`);
        console.log(`   Quality: ${summaryLength > 500 ? '✅ COMPREHENSIVE' : '❌ TOO SHORT'}`);
        if (result.summary) {
            console.log(`   Preview: ${result.summary.substring(0, 100)}...`);
        }

        // Test work experience extraction
        console.log('');
        console.log('💼 WORK EXPERIENCE:');
        const experienceCount = result.workExperience?.length || 0;
        console.log(`   Count: ${experienceCount} entries`);
        console.log(`   Quality: ${experienceCount >= 2 ? '✅ GOOD' : '❌ MISSING ENTRIES'}`);

        if (result.workExperience && result.workExperience.length > 0) {
            result.workExperience.forEach((job, index) => {
                console.log(`   Job ${index + 1}: ${job.position || 'No position'} at ${job.company || 'No company'}`);
                console.log(`     Responsibilities: ${job.responsibilities?.length || 0} items`);
                console.log(`     Achievements: ${job.achievements?.length || 0} items`);
            });
        }

        // Test publications extraction
        console.log('');
        console.log('📚 PUBLICATIONS:');
        const publicationCount = result.publications?.length || 0;
        console.log(`   Count: ${publicationCount} publications`);
        console.log(`   Quality: ${publicationCount >= 3 ? '✅ COMPLETE' : '❌ MISSING PUBLICATIONS'}`);

        if (result.publications && result.publications.length > 0) {
            result.publications.forEach((pub, index) => {
                console.log(`   Pub ${index + 1}: ${pub.title || 'No title'}`);
                console.log(`     Authors: ${pub.authors || 'No authors'}`);
            });
        }

        // Test education extraction
        console.log('');
        console.log('🎓 EDUCATION:');
        const educationCount = result.education?.length || 0;
        console.log(`   Count: ${educationCount} degrees`);
        console.log(`   Quality: ${educationCount >= 2 ? '✅ COMPLETE' : '❌ MISSING DEGREES'}`);

        console.log('');
        console.log('🎯 DIAGNOSTIC SUMMARY:');
        console.log('======================');

        const issues = [];
        if (summaryLength < 500) issues.push('Profile too short');
        if (experienceCount < 2) issues.push('Missing work experience');
        if (publicationCount < 3) issues.push('Missing publications');
        if (educationCount < 2) issues.push('Missing education');

        if (issues.length === 0) {
            console.log('✅ AI EXTRACTION WORKING PERFECTLY!');
            console.log('💡 Issue likely in template syntax or data preparation');
        } else {
            console.log('❌ AI EXTRACTION ISSUES FOUND:');
            issues.forEach(issue => console.log(`   • ${issue}`));
            console.log('💡 AI prompts may need adjustment');
        }

    } catch (error) {
        console.error('❌ DIAGNOSTIC FAILED:', error.message);
        console.log('💡 Check API key and network connection');
    }
}

// Run diagnostic
if (require.main === module) {
    runDiagnostic();
}

module.exports = { runDiagnostic }; 