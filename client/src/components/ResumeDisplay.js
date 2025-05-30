import React, { useState } from 'react';
import EditableField from './EditableField';

const ResumeDisplay = ({ resumeData, onSave, onCancel, isEditing = false }) => {
    const [editData, setEditData] = useState(resumeData || {});
    const [isModified, setIsModified] = useState(false);

    const handleFieldChange = (path, value) => {
        const pathArray = path.split('.');
        const newData = { ...editData };

        let current = newData;
        for (let i = 0; i < pathArray.length - 1; i++) {
            if (!current[pathArray[i]]) {
                current[pathArray[i]] = {};
            }
            current = current[pathArray[i]];
        }
        current[pathArray[pathArray.length - 1]] = value;

        setEditData(newData);
        setIsModified(true);
    };

    const handleArrayAdd = (path, newItem) => {
        const pathArray = path.split('.');
        const newData = { ...editData };

        let current = newData;
        for (let i = 0; i < pathArray.length - 1; i++) {
            if (!current[pathArray[i]]) {
                current[pathArray[i]] = [];
            }
            current = current[pathArray[i]];
        }

        const arrayField = pathArray[pathArray.length - 1];
        if (!current[arrayField]) {
            current[arrayField] = [];
        }
        current[arrayField].push(newItem);

        setEditData(newData);
        setIsModified(true);
    };

    const handleArrayRemove = (path, index) => {
        const pathArray = path.split('.');
        const newData = { ...editData };

        let current = newData;
        for (let i = 0; i < pathArray.length - 1; i++) {
            current = current[pathArray[i]];
        }

        const arrayField = pathArray[pathArray.length - 1];
        current[arrayField].splice(index, 1);

        setEditData(newData);
        setIsModified(true);
    };

    const handleSave = () => {
        if (onSave) {
            onSave(editData);
        }
        setIsModified(false);
    };

    const handleCancel = () => {
        setEditData(resumeData || {});
        setIsModified(false);
        if (onCancel) {
            onCancel();
        }
    };

    // Professional IOD PARC template styles
    const containerStyle = {
        maxWidth: '210mm', // A4 width
        margin: '20px auto',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: 'Calibri, Arial, sans-serif',
        fontSize: '11pt',
        lineHeight: '1.15',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        border: '1px solid #e0e0e0',
        minHeight: '297mm' // A4 height
    };

    const headerStyle = {
        backgroundColor: '#2c5aa0', // Professional blue header
        color: '#ffffff',
        padding: '20px 30px',
        textAlign: 'center',
        position: 'relative'
    };

    const logoStyle = {
        position: 'absolute',
        right: '20px',
        top: '20px',
        fontSize: '14pt',
        fontWeight: 'bold'
    };

    const nameStyle = {
        fontSize: '24pt',
        fontWeight: 'bold',
        margin: '0 0 5px 0',
        textTransform: 'uppercase'
    };

    const titleStyle = {
        fontSize: '14pt',
        fontWeight: 'normal',
        margin: '0'
    };

    const tableStyle = {
        width: '100%',
        borderCollapse: 'collapse',
        margin: '0',
        height: 'calc(100% - 100px)'
    };

    const leftColumnStyle = {
        width: '180px',
        verticalAlign: 'top',
        backgroundColor: '#f8f9fa',
        padding: '15px',
        borderRight: '2px solid #2c5aa0'
    };

    const rightColumnStyle = {
        verticalAlign: 'top',
        padding: '15px 20px',
        backgroundColor: '#ffffff'
    };

    const sectionHeaderStyle = {
        backgroundColor: '#2c5aa0',
        color: '#ffffff',
        padding: '8px 12px',
        margin: '0 0 10px 0',
        fontSize: '12pt',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    };

    const sectionContentStyle = {
        marginBottom: '20px',
        fontSize: '10pt',
        lineHeight: '1.3'
    };

    const experienceItemStyle = {
        marginBottom: '15px',
        paddingBottom: '12px',
        borderBottom: '1px solid #e9ecef'
    };

    const jobTitleStyle = {
        fontWeight: 'bold',
        fontSize: '11pt',
        color: '#2c5aa0',
        marginBottom: '2px'
    };

    const companyStyle = {
        fontWeight: 'bold',
        fontSize: '10pt',
        marginBottom: '2px'
    };

    const dateLocationStyle = {
        fontSize: '9pt',
        color: '#6c757d',
        fontStyle: 'italic',
        marginBottom: '5px'
    };

    const buttonStyle = {
        padding: '10px 20px',
        margin: '5px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
    };

    const saveButtonStyle = {
        ...buttonStyle,
        backgroundColor: '#27ae60',
        color: 'white'
    };

    const cancelButtonStyle = {
        ...buttonStyle,
        backgroundColor: '#e74c3c',
        color: 'white'
    };

    const addButtonStyle = {
        ...buttonStyle,
        backgroundColor: '#3498db',
        color: 'white',
        fontSize: '12px',
        padding: '5px 10px'
    };

    if (!resumeData && !editData) {
        return (
            <div style={containerStyle}>
                <p style={{ textAlign: 'center', color: '#7f8c8d', padding: '50px' }}>
                    No resume data available.
                </p>
            </div>
        );
    }

    const data = isEditing ? editData : resumeData;

    return (
        <div style={containerStyle}>
            {/* Action Buttons */}
            {isEditing && (
                <div style={{ textAlign: 'center', marginBottom: '20px', padding: '20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                    <button
                        style={saveButtonStyle}
                        onClick={handleSave}
                        disabled={!isModified}
                    >
                        Save Changes
                    </button>
                    <button style={cancelButtonStyle} onClick={handleCancel}>
                        Cancel
                    </button>
                </div>
            )}

            {/* Header Section */}
            <div style={headerStyle}>
                <div style={logoStyle}>parc</div>
                <h1 style={nameStyle}>
                    <EditableField
                        value={data.personalDetails?.name || 'CANDIDATE NAME'}
                        onChange={(value) => handleFieldChange('personalDetails.name', value)}
                        isEditing={isEditing}
                        style={{ color: '#ffffff', fontSize: '24pt', fontWeight: 'bold' }}
                    />
                </h1>
                <div style={titleStyle}>
                    <EditableField
                        value={data.personalDetails?.title || data.summary?.split('.')[0] || 'Senior Evaluator'}
                        onChange={(value) => handleFieldChange('personalDetails.title', value)}
                        isEditing={isEditing}
                        style={{ color: '#ffffff' }}
                    />
                </div>
            </div>

            {/* Main Content Table */}
            <table style={tableStyle}>
                <tbody>
                    <tr>
                        {/* Left Column */}
                        <td style={leftColumnStyle}>
                            {/* Profile Section */}
                            <div style={sectionContentStyle}>
                                <div style={sectionHeaderStyle}>Profile</div>
                                <div style={{ textAlign: 'justify' }}>
                                    <EditableField
                                        value={data.summary || data.profile || 'Professional summary goes here...'}
                                        onChange={(value) => handleFieldChange('summary', value)}
                                        isEditing={isEditing}
                                        multiline={true}
                                        style={{ fontSize: '10pt', lineHeight: '1.3' }}
                                    />
                                </div>
                            </div>

                            {/* Nationality Section */}
                            <div style={sectionContentStyle}>
                                <div style={sectionHeaderStyle}>Nationality</div>
                                <div>
                                    <EditableField
                                        value={data.personalDetails?.nationality || data.nationality || 'Lebanese and American, resident in Italy'}
                                        onChange={(value) => handleFieldChange('personalDetails.nationality', value)}
                                        isEditing={isEditing}
                                    />
                                </div>
                            </div>

                            {/* Languages Section */}
                            <div style={sectionContentStyle}>
                                <div style={sectionHeaderStyle}>Languages</div>
                                <div>
                                    {data.skills?.languages && data.skills.languages.length > 0 ? (
                                        data.skills.languages.map((lang, index) => (
                                            <div key={index} style={{ marginBottom: '3px' }}>
                                                <EditableField
                                                    value={lang}
                                                    onChange={(value) => {
                                                        const newLangs = [...(data.skills?.languages || [])];
                                                        newLangs[index] = value;
                                                        handleFieldChange('skills.languages', newLangs);
                                                    }}
                                                    isEditing={isEditing}
                                                />
                                                {isEditing && (
                                                    <button
                                                        style={{ ...addButtonStyle, backgroundColor: '#e74c3c', marginLeft: '5px', padding: '2px 5px' }}
                                                        onClick={() => {
                                                            const newLangs = [...(data.skills?.languages || [])];
                                                            newLangs.splice(index, 1);
                                                            handleFieldChange('skills.languages', newLangs);
                                                        }}
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div>
                                            <div>Fluent in English, French, and Arabic;</div>
                                            <div>working knowledge of Spanish and Italian</div>
                                        </div>
                                    )}
                                    {isEditing && (
                                        <button
                                            style={{ ...addButtonStyle, marginTop: '5px' }}
                                            onClick={() => {
                                                const newLangs = [...(data.skills?.languages || []), 'New Language'];
                                                handleFieldChange('skills.languages', newLangs);
                                            }}
                                        >
                                            Add Language
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Qualifications Section */}
                            <div style={sectionContentStyle}>
                                <div style={sectionHeaderStyle}>Qualifications</div>
                                <div>
                                    {data.education && data.education.length > 0 ? (
                                        data.education.map((edu, index) => (
                                            <div key={index} style={{ marginBottom: '12px' }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '10pt' }}>
                                                    <EditableField
                                                        value={edu.degree || 'Degree'}
                                                        onChange={(value) => handleFieldChange(`education.${index}.degree`, value)}
                                                        isEditing={isEditing}
                                                    />
                                                </div>
                                                <div style={{ fontSize: '9pt', marginBottom: '2px' }}>
                                                    <EditableField
                                                        value={edu.institution || 'Institution'}
                                                        onChange={(value) => handleFieldChange(`education.${index}.institution`, value)}
                                                        isEditing={isEditing}
                                                    />
                                                </div>
                                                <div style={{ fontSize: '9pt', color: '#666', marginBottom: '3px' }}>
                                                    <EditableField
                                                        value={edu.graduationDate || edu.year || 'Year'}
                                                        onChange={(value) => handleFieldChange(`education.${index}.graduationDate`, value)}
                                                        isEditing={isEditing}
                                                    />
                                                </div>
                                                {edu.description && (
                                                    <div style={{ fontSize: '9pt', fontStyle: 'italic', marginTop: '3px' }}>
                                                        <EditableField
                                                            value={edu.description || edu.thesis}
                                                            onChange={(value) => handleFieldChange(`education.${index}.description`, value)}
                                                            isEditing={isEditing}
                                                            multiline={true}
                                                        />
                                                    </div>
                                                )}
                                                {isEditing && (
                                                    <button
                                                        style={{ ...addButtonStyle, backgroundColor: '#e74c3c', marginTop: '5px' }}
                                                        onClick={() => handleArrayRemove('education', index)}
                                                    >
                                                        Remove Education
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div>
                                            <div style={{ fontWeight: 'bold' }}>Master's in International Public Policy</div>
                                            <div style={{ fontSize: '9pt' }}>Johns Hopkins University</div>
                                            <div style={{ fontSize: '9pt', color: '#666' }}>2006</div>
                                        </div>
                                    )}
                                    {isEditing && (
                                        <button
                                            style={addButtonStyle}
                                            onClick={() => handleArrayAdd('education', { institution: '', degree: '', graduationDate: '', description: '' })}
                                        >
                                            Add Education
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Country Work Experience Section */}
                            <div style={sectionContentStyle}>
                                <div style={sectionHeaderStyle}>Country work experience</div>
                                <div style={{ fontSize: '9pt' }}>
                                    {data.countryExperience && data.countryExperience.length > 0 ? (
                                        data.countryExperience.map((country, index) => (
                                            <div key={index} style={{ marginBottom: '5px' }}>
                                                <EditableField
                                                    value={country}
                                                    onChange={(value) => {
                                                        const newCountries = [...(data.countryExperience || [])];
                                                        newCountries[index] = value;
                                                        handleFieldChange('countryExperience', newCountries);
                                                    }}
                                                    isEditing={isEditing}
                                                />
                                            </div>
                                        ))
                                    ) : (
                                        <div>
                                            <div><strong>Sub-Saharan Africa</strong> (Mauritania, Senegal, Burkina Faso, Guinea, Sierra Leone, Côte d'Ivoire, Niger, Central African Republic, Cameroon, Democratic Republic of Congo, Ethiopia, Eritrea, Kenya, Uganda, Rwanda, Burundi, Tanzania, Zambia, Mozambique, Zimbabwe, and Madagascar);</div>
                                            <div><strong>Middle East/North Africa</strong> (Lebanon, Syria, Jordan, West Bank/Gaza, Iraq, Kuwait, Yemen, Egypt, Tunisia, and Morocco);</div>
                                            <div><strong>Commonwealth of Independent States</strong> (Georgia, Kyrgyzstan, Kazakhstan, Uzbekistan, and Tajikistan);</div>
                                            <div><strong>the Balkans</strong> (Macedonia, Kosovo, and Albania);</div>
                                            <div><strong>Asia</strong> (Afghanistan, Nepal, India, Mongolia and Philippines);</div>
                                            <div><strong>Latin America and the Caribbean</strong> (Brazil, Bolivia, Nicaragua and Haiti);</div>
                                            <div><strong>and OECD countries</strong> (USA, Germany, Greece, Italy and Turkey).</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </td>

                        {/* Right Column */}
                        <td style={rightColumnStyle}>
                            {/* Experience Section */}
                            <div style={sectionContentStyle}>
                                <div style={sectionHeaderStyle}>Experience</div>
                                {data.workExperience && data.workExperience.length > 0 ? (
                                    data.workExperience.map((work, index) => (
                                        <div key={index} style={experienceItemStyle}>
                                            <div style={jobTitleStyle}>
                                                <EditableField
                                                    value={work.position || 'Position Title'}
                                                    onChange={(value) => handleFieldChange(`workExperience.${index}.position`, value)}
                                                    isEditing={isEditing}
                                                />
                                            </div>
                                            <div style={companyStyle}>
                                                <EditableField
                                                    value={work.company || 'Company Name'}
                                                    onChange={(value) => handleFieldChange(`workExperience.${index}.company`, value)}
                                                    isEditing={isEditing}
                                                />
                                            </div>
                                            <div style={dateLocationStyle}>
                                                <EditableField
                                                    value={`${work.startDate || 'Start'} - ${work.endDate || 'End'}${work.location ? ` | ${work.location}` : ''}`}
                                                    onChange={(value) => {
                                                        const parts = value.split(' | ');
                                                        const datePart = parts[0];
                                                        const locationPart = parts[1] || '';
                                                        const [start, end] = datePart.split(' - ');
                                                        handleFieldChange(`workExperience.${index}.startDate`, start?.trim());
                                                        handleFieldChange(`workExperience.${index}.endDate`, end?.trim());
                                                        if (locationPart) {
                                                            handleFieldChange(`workExperience.${index}.location`, locationPart.trim());
                                                        }
                                                    }}
                                                    isEditing={isEditing}
                                                />
                                            </div>
                                            <div style={{ textAlign: 'justify' }}>
                                                <EditableField
                                                    value={work.description || (Array.isArray(work.responsibilities) ? work.responsibilities.join('. ') : work.responsibilities) || 'Job description and responsibilities...'}
                                                    onChange={(value) => handleFieldChange(`workExperience.${index}.description`, value)}
                                                    isEditing={isEditing}
                                                    multiline={true}
                                                />
                                            </div>
                                            {isEditing && (
                                                <button
                                                    style={{ ...addButtonStyle, backgroundColor: '#e74c3c', marginTop: '10px' }}
                                                    onClick={() => handleArrayRemove('workExperience', index)}
                                                >
                                                    Remove Experience
                                                </button>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div>No work experience listed</div>
                                )}
                                {isEditing && (
                                    <button
                                        style={addButtonStyle}
                                        onClick={() => handleArrayAdd('workExperience', {
                                            company: '',
                                            position: '',
                                            startDate: '',
                                            endDate: '',
                                            location: '',
                                            description: ''
                                        })}
                                    >
                                        Add Experience
                                    </button>
                                )}
                            </div>

                            {/* Publications Section */}
                            {data.publications && data.publications.length > 0 && (
                                <div style={sectionContentStyle}>
                                    <div style={sectionHeaderStyle}>Publications</div>
                                    {data.publications.map((pub, index) => (
                                        <div key={index} style={{ marginBottom: '12px', fontSize: '10pt' }}>
                                            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                                                <EditableField
                                                    value={pub.title || 'Publication Title'}
                                                    onChange={(value) => handleFieldChange(`publications.${index}.title`, value)}
                                                    isEditing={isEditing}
                                                />
                                            </div>
                                            <div style={{ fontSize: '9pt', marginBottom: '2px' }}>
                                                <EditableField
                                                    value={pub.authors || pub.author || 'Authors'}
                                                    onChange={(value) => handleFieldChange(`publications.${index}.authors`, value)}
                                                    isEditing={isEditing}
                                                />
                                            </div>
                                            <div style={{ fontSize: '9pt', fontStyle: 'italic', marginBottom: '3px' }}>
                                                <EditableField
                                                    value={pub.journal || pub.venue || pub.publication || 'Publication Venue'}
                                                    onChange={(value) => handleFieldChange(`publications.${index}.journal`, value)}
                                                    isEditing={isEditing}
                                                />
                                            </div>
                                            {pub.abstract && (
                                                <div style={{ fontSize: '9pt', marginTop: '3px', textAlign: 'justify' }}>
                                                    <strong>Abstract:</strong>
                                                    <EditableField
                                                        value={pub.abstract}
                                                        onChange={(value) => handleFieldChange(`publications.${index}.abstract`, value)}
                                                        isEditing={isEditing}
                                                        multiline={true}
                                                    />
                                                </div>
                                            )}
                                            {isEditing && (
                                                <button
                                                    style={{ ...addButtonStyle, backgroundColor: '#e74c3c', marginTop: '5px' }}
                                                    onClick={() => handleArrayRemove('publications', index)}
                                                >
                                                    Remove Publication
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {isEditing && (
                                        <button
                                            style={addButtonStyle}
                                            onClick={() => handleArrayAdd('publications', {
                                                title: '',
                                                authors: '',
                                                journal: '',
                                                abstract: ''
                                            })}
                                        >
                                            Add Publication
                                        </button>
                                    )}
                                </div>
                            )}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

export default ResumeDisplay;
