import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { geminiService } from '../services/gemini.js';
import { imageGenService } from '../services/imageGenService';
import { useAuth } from '../context/AuthContext';
import { Image, MessageSquare, PenTool } from 'lucide-react';

const SessionWorkspace = () => {
    const { sessionId } = useParams();
    const { currentUser } = useAuth(); // Need to get currentUser ID
    const [sessionData, setSessionData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('creation'); // Default to creation for Feature 1 priority

    // Feature 3 States
    const [selectedImage, setSelectedImage] = useState(null);
    const [visionAnalysis, setVisionAnalysis] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const [userCritique, setUserCritique] = useState('');
    const [refinedCritique, setRefinedCritique] = useState('');
    const [isRefining, setIsRefining] = useState(false);

    // Feature 1 States
    const [genPrompt, setGenPrompt] = useState('');
    const [myGenerations, setMyGenerations] = useState([]);

    useEffect(() => {
        const fetchSession = async () => {
            if (!sessionId) return;
            try {
                // We need to find which class this session belongs to. 
                // Since our routing /session/:sessionId doesn't have classId, we might need a composite ID or search.
                // For MVP, let's assume we pass classId in query or params, OR we query sessionsGroup (collectionGroup).
                // Strategy: We'll use a hack for now or assume parent logic passed it. 
                // Better: Update router to be /class/:classId/session/:sessionId or use collectionGroup query to find it.
                // Let's use the latter for robustness.
                // NOTE: For simplicity, I'll update routing to include classId in the next Step.
            } catch (e) {
                console.error(e);
            }
        };
        // Using a manual approach for now:
        // Ideally router should be /class/:classId/session/:sessionId
    }, [sessionId]);

    useEffect(() => {
        if (sessionId) {
            // Subscribe to my generations
            const unsubscribe = imageGenService.subscribeToQueue(sessionId, (items) => {
                if (userRole === 'teacher') {
                    setTeacherQueue(items);
                } else if (currentUser) {
                    const mine = items.filter(i => i.studentId === currentUser.uid);
                    setMyGenerations(mine);
                }
            });
            return () => unsubscribe();
        }
    }, [sessionId, currentUser, userRole]);

    // Temp mock fetch until router update
    const [mockClassId] = useState('temp_class_id');

    useEffect(() => {
        // Mock for UI dev
        setSessionData({
            title: "Impressionism Workshop",
            visionPrompt: "Analyze the color and light.",
            textPrompt: "Make it sound poetic.",
            chatbotInstruction: "You are Van Gogh.",
            features: { vision: true, imageGen: true, chat: true, appreciation: true }
        });
        setLoading(false);
    }, []);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setSelectedImage(file);
        setIsAnalyzing(true);

        try {
            const analysis = await geminiService.analyzeImage(file, sessionData.visionPrompt);
            setVisionAnalysis(analysis);
        } catch (error) {
            setVisionAnalysis("Error analyzing image: " + error.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleCritiqueRefinement = async () => {
        if (!userCritique) return;
        setIsRefining(true);
        try {
            const result = await geminiService.refineText(userCritique, sessionData.textPrompt);
            setRefinedCritique(result);
        } catch (error) {
            setRefinedCritique("Error: " + error.message);
        } finally {
            setIsRefining(false);
        }
    };

    const handleSubmitPrompt = async () => {
        if (!genPrompt) return;
        // Basic Client-side Relevance Check (Mock for now or use Gemini)
        if (genPrompt.toLowerCase().includes("violence")) {
            alert("Warning: Inappropriate content detected.");
            return;
        }
        await imageGenService.submitPrompt(sessionId, currentUser.uid, genPrompt);
        setGenPrompt('');
    };

    // Teacher Actions
    const handleTeacherAction = async (genId, action, payload) => {
        if (action === 'approve') {
            await imageGenService.approvePrompt(sessionId, genId);
        } else if (action === 'reject') {
            const reason = prompt("Reason for rejection:");
            if (reason) await imageGenService.rejectPrompt(sessionId, genId, reason);
        } else if (action === 'generate') {
            // Simulation of System Generation
            await imageGenService.completeGeneration(sessionId, genId, "https://picsum.photos/512"); // Mock URL
        } else if (action === 'publish') {
            await imageGenService.publishImage(sessionId, genId);
        }
    };

    if (loading) return <div>Loading Workspace...</div>;

    return (
        <div className="workspace-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', height: '85vh', display: 'flex', flexDirection: 'column' }}>
            <header style={{ borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <h1>{sessionData.title}</h1>
                <p>🎨 AI 도움 받기 수업</p>
            </header>

            <div className="workspace-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                {sessionData.features?.imageGen && (
                    <button
                        className={activeTab === 'creation' ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => setActiveTab('creation')}
                    >
                        <Image size={16} /> Creation (Feature 1)
                    </button>
                )}

                {sessionData.features?.vision && (
                    <button
                        className={activeTab === 'vision' ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => setActiveTab('vision')}
                    >
                        <Image size={16} /> Vision Analysis
                    </button>
                )}

                {(sessionData.features?.appreciation || sessionData.features?.textHelp) && (
                    <button
                        className={activeTab === 'text' ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => setActiveTab('text')}
                    >
                        <PenTool size={16} /> Expression Helper
                    </button>
                )}

                {sessionData.features?.chat && (
                    <button
                        className={activeTab === 'chat' ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => setActiveTab('chat')}
                    >
                        <MessageSquare size={16} /> 💬 챗봇
                    </button>
                )}

                {sessionData.features?.appreciation && (
                    <button
                        className={activeTab === 'appreciation' ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => setActiveTab('appreciation')}
                    >
                        <Image size={16} /> Appreciation Loop
                    </button>
                )}
            </div>

            <div className="workspace-content" style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '2rem', background: '#fff', overflowY: 'auto' }}>

                {/* CREATION TOOL (Dynamic based on Role) */}
                {activeTab === 'creation' && (
                    <div className="tool-creation" style={{ display: 'flex', gap: '2rem' }}>
                        {userRole === 'teacher' ? (
                            <div style={{ flex: 1 }}>
                                <h3>Teacher Control Center</h3>
                                <div className="queue-list" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
                                    <h4>Pending Approval</h4>
                                    {teacherQueue.filter(i => i.status === 'pending_approval').map(item => (
                                        <div key={item.id} style={{ padding: '0.5rem', borderBottom: '1px solid #ddd', marginBottom: '0.5rem' }}>
                                            <p><strong>{item.prompt}</strong> (by Student)</p>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={() => handleTeacherAction(item.id, 'approve')} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.3rem' }}>Approve</button>
                                                <button onClick={() => handleTeacherAction(item.id, 'reject')} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.3rem' }}>Reject</button>
                                            </div>
                                        </div>
                                    ))}

                                    <h4 style={{ marginTop: '2rem' }}>Generating / Review</h4>
                                    {teacherQueue.filter(i => i.status === 'approved').map(item => (
                                        <div key={item.id} style={{ padding: '0.5rem', borderBottom: '1px solid #ddd', marginBottom: '0.5rem' }}>
                                            <p><strong>{item.prompt}</strong> - Approved</p>
                                            <button onClick={() => handleTeacherAction(item.id, 'generate')} className="btn-primary">
                                                Simulate System Generation
                                            </button>
                                        </div>
                                    ))}

                                    {teacherQueue.filter(i => i.status === 'generated').map(item => (
                                        <div key={item.id} style={{ padding: '0.5rem', borderBottom: '1px solid #ddd', marginBottom: '0.5rem' }}>
                                            <p>Generated Image:</p>
                                            <img src={item.imageUrl} alt="Review" style={{ width: '100px', height: '100px', objectFit: 'cover' }} />
                                            <div style={{ marginTop: '0.5rem' }}>
                                                <button onClick={() => handleTeacherAction(item.id, 'publish')} style={{ background: '#6366f1', color: 'white', border: 'none', padding: '0.5rem' }}>
                                                    Publish to Student
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            // Student View (Existing)
                            <>
                                <div style={{ flex: 1 }}>
                                    <h3>Create New Artwork</h3>
                                    <p>Describe what you want to draw. Your teacher will review it first.</p>
                                    <textarea
                                        value={genPrompt}
                                        onChange={(e) => setGenPrompt(e.target.value)}
                                        style={{ width: '100%', height: '100px' }}
                                        placeholder="I want to draw a flying car..."
                                    />
                                    <button onClick={handleSubmitPrompt} className="btn-primary" style={{ marginTop: '1rem' }}>
                                        Submit for Approval
                                    </button>
                                </div>
                                <div style={{ flex: 1, background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
                                    <h3>My Gallery</h3>
                                    {myGenerations.map(gen => (
                                        <div key={gen.id} style={{ marginBottom: '1rem', padding: '0.5rem', background: '#fff', border: '1px solid #ddd' }}>
                                            <p><strong>Prompt:</strong> {gen.prompt}</p>
                                            <p>Status: <span style={{ fontWeight: 'bold', color: gen.status === 'published' ? 'green' : 'orange' }}>{gen.status}</span></p>
                                            {gen.status === 'published' && gen.imageUrl && (
                                                <img src={gen.imageUrl} alt="Generated" style={{ width: '100%', borderRadius: '0.5rem' }} />
                                            )}
                                            {gen.status === 'rejected' && (
                                                <p style={{ color: 'red' }}>Reason: {gen.rejectionReason || "Not appropriate"}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* VISION TOOL */}
                {activeTab === 'vision' && (
                    <div className="tool-vision" style={{ display: 'flex', gap: '2rem' }}>
                        <div style={{ flex: 1 }}>
                            <h3>Upload Artwork</h3>
                            <input type="file" accept="image/*" onChange={handleImageUpload} />
                            {selectedImage && (
                                <div style={{ marginTop: '1rem' }}>
                                    <img src={URL.createObjectURL(selectedImage)} alt="Upload" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '0.5rem' }} />
                                </div>
                            )}
                        </div>
                        <div style={{ flex: 1, background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
                            <h3>AI Analysis</h3>
                            <p style={{ fontStyle: 'italic', color: '#666' }}>Prompt: "{sessionData.visionPrompt}"</p>
                            <hr style={{ borderColor: '#eee' }} />
                            {isAnalyzing ? <p>Analyzing pixels...</p> : (
                                <div style={{ whiteSpace: 'pre-wrap' }}>{visionAnalysis}</div>
                            )}
                        </div>
                    </div>
                )}

                {/* TEXT TOOL */}
                {activeTab === 'text' && (
                    <div className="tool-text" style={{ display: 'flex', gap: '2rem' }}>
                        <div style={{ flex: 1 }}>
                            <h3>Your Thoughts</h3>
                            <textarea
                                value={userCritique}
                                onChange={(e) => setUserCritique(e.target.value)}
                                style={{ width: '100%', height: '200px', padding: '0.5rem' }}
                                placeholder="Describe what you see and feel..."
                            />
                            <button className="btn-primary" onClick={handleCritiqueRefinement} style={{ marginTop: '1rem' }}>
                                Refine Expression
                            </button>
                        </div>
                        <div style={{ flex: 1, background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
                            <h3>Expression Helper</h3>
                            <p style={{ fontStyle: 'italic', color: '#666' }}>Goal: "{sessionData.textPrompt}"</p>
                            <hr style={{ borderColor: '#eee' }} />
                            {isRefining ? <p>Polishing your words...</p> : (
                                <div style={{ whiteSpace: 'pre-wrap' }}>{refinedCritique}</div>
                            )}
                        </div>
                    </div>
                )}

                {/* CHAT TOOL */}
                {activeTab === 'chat' && (
                    <div>
                        <h3>Chat with {sessionData.chatbotInstruction ? "Persona" : "AI Guide"}</h3>
                        <div style={{ height: '300px', border: '1px solid #ddd', padding: '1rem', borderRadius: '0.5rem', background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <p>Chat Interface Placeholder (Use Gemini Service chatWithPersona)</p>
                        </div>
                    </div>
                )}

                {/* APPRECIATION LOOP (Feature 4) */}
                {activeTab === 'appreciation' && (
                    <div className="tool-appreciation">
                        {!sessionData.referenceImageUrl ? (
                            <p>No reference image set for this session.</p>
                        ) : (
                            <div style={{ display: 'flex', gap: '2rem', flexDirection: 'column' }}>
                                <div className="stage-1" style={{ display: 'flex', gap: '2rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <h3>Step 1: Deep Observation</h3>
                                        <img src={sessionData.referenceImageUrl} alt="Reference" style={{ maxWidth: '100%', borderRadius: '0.5rem', maxHeight: '400px' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3>What do you see?</h3>
                                        <p>Describe the colors, lines, and feelings.</p>
                                        <textarea
                                            value={userCritique}
                                            onChange={e => setUserCritique(e.target.value)}
                                            style={{ width: '100%', height: '150px' }}
                                            placeholder="I see..."
                                        />
                                        <button onClick={handleCritiqueRefinement} className="btn-secondary" style={{ marginTop: '0.5rem' }}>Get AI Help</button>
                                        {refinedCritique && <div style={{ background: '#f0f9ff', padding: '0.5rem', marginTop: '0.5rem', borderRadius: '0.5rem' }}>AI Suggestion: {refinedCritique}</div>}
                                    </div>
                                </div>

                                <div className="stage-2" style={{ borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                                    <h3>Step 2: Recreation & Comparison</h3>
                                    <p>Try to recreate this artwork using your observation words!</p>
                                    <button
                                        className="btn-primary"
                                        onClick={() => {
                                            setGenPrompt(userCritique); // Copy observation to prompt
                                            setActiveTab('creation'); // Switch to creation tab
                                            alert("Your observation has been copied to the Creation Tool! Submit it to see what happens.");
                                        }}
                                    >
                                        Go to Creation Tool with my Observation
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SessionWorkspace;
