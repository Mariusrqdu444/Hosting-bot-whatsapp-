import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useForm } from 'react-hook-form';
import axios from 'axios';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background-color: #0d1117;
  color: #c9d1d9;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #30363d;

  h1 {
    font-size: 1.8rem;
    color: #58a6ff;
    margin: 0;
  }
`;

const StatusBar = styled.div`
  display: flex;
  align-items: center;
  background: ${(props) => 
    props.status === 'connected' ? 'rgba(56, 139, 56, 0.1)' :
    props.status === 'connecting' ? 'rgba(227, 181, 5, 0.1)' :
    'rgba(215, 58, 63, 0.1)'
  };
  border: 1px solid ${(props) => 
    props.status === 'connected' ? '#388b38' :
    props.status === 'connecting' ? '#e3b505' :
    '#d73a3f'
  };
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 20px;
`;

const StatusDot = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${(props) => 
    props.status === 'connected' ? '#388b38' :
    props.status === 'connecting' ? '#e3b505' :
    '#d73a3f'
  };
  margin-right: 10px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const FormSection = styled.div`
  background: #161b22;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 10px;
`;

const SectionTitle = styled.h2`
  font-size: 1.2rem;
  margin-top: 0;
  margin-bottom: 15px;
  color: #58a6ff;
  border-bottom: 1px solid #30363d;
  padding-bottom: 8px;
`;

const FormGroup = styled.div`
  margin-bottom: 15px;

  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
  }

  input, textarea, select {
    width: 100%;
    padding: 10px;
    border: 1px solid #30363d;
    border-radius: 4px;
    background-color: #0d1117;
    color: #c9d1d9;
    font-size: 14px;

    &:focus {
      outline: none;
      border-color: #58a6ff;
      box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.2);
    }
  }

  textarea {
    min-height: 100px;
    resize: vertical;
  }
`;

const RadioGroup = styled.div`
  display: flex;
  gap: 15px;

  label {
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  input[type="radio"] {
    width: auto;
    margin-right: 5px;
  }
`;

const Button = styled.button`
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &.primary {
    background-color: #238636;
    color: white;

    &:hover {
      background-color: #2ea043;
    }

    &:disabled {
      background-color: #238636;
      opacity: 0.7;
      cursor: not-allowed;
    }
  }

  &.danger {
    background-color: #da3633;
    color: white;

    &:hover {
      background-color: #f85149;
    }
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 10px;
`;

const ErrorMessage = styled.span`
  color: #f85149;
  font-size: 0.85rem;
  margin-top: 5px;
  display: block;
`;

const PairingCodeContainer = styled.div`
  text-align: center;
  margin: 20px 0;
  font-size: 24px;
  letter-spacing: 5px;
  background-color: #161b22;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #30363d;
`;

const LogContainer = styled.div`
  margin-top: 20px;
  background-color: #161b22;
  border-radius: 8px;
  padding: 15px;
  max-height: 300px;
  overflow-y: auto;
`;

const LogEntry = styled.div`
  padding: 5px 0;
  border-bottom: 1px solid #30363d;
  font-family: monospace;
  
  &:last-child {
    border-bottom: none;
  }
  
  &.info {
    color: #79c0ff;
  }
  
  &.success {
    color: #7ee787;
  }
  
  &.error {
    color: #f85149;
  }
  
  &.warning {
    color: #e3b505;
  }
`;

const WhatsAppMessageForm = () => {
  const { register, handleSubmit, watch, formState: { errors }, setValue } = useForm({
    defaultValues: {
      userPhone: '',
      targetType: 'individual',
      targetPhones: '',
      messageInputType: 'direct',
      messageText: '',
      messageDelay: 1,
      enableRetry: true,
      maxRetries: 3
    }
  });

  const [status, setStatus] = useState('disconnected');
  const [isMessaging, setIsMessaging] = useState(false);
  const [pairingCode, setPairingCode] = useState('');
  const [pairingStep, setPairingStep] = useState(1);
  const [logs, setLogs] = useState([]);
  const [messageFile, setMessageFile] = useState(null);
  const [credsFile, setCredsFile] = useState(null);

  const messageInputType = watch('messageInputType');
  const targetType = watch('targetType');
  const userPhone = watch('userPhone');
  const enableRetry = watch('enableRetry');

  // Generate pairing code
  const generatePairingCode = async () => {
    if (!userPhone) {
      addLog('Please enter your phone number first', 'error');
      return;
    }

    try {
      addLog('Requesting pairing code...', 'info');
      const response = await axios.post('/api/pairing', { phoneNumber: userPhone });
      setPairingCode(response.data.pairingCode);
      setPairingStep(2);
      addLog(`Pairing code generated: ${response.data.pairingCode}`, 'success');
    } catch (error) {
      addLog(`Error generating pairing code: ${error.response?.data?.error || error.message}`, 'error');
      console.error('Error generating pairing code:', error);
    }
  };

  // Check status periodically
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await axios.get('/api/status');
        setStatus(response.data.status);

        if (response.data.status === 'open' || response.data.status === 'connected') {
          addLog('Connected to WhatsApp', 'success');
          setPairingStep(3);
        }
      } catch (error) {
        console.error('Error checking status:', error);
      }
    };

    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const onSubmit = async (data) => {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      // Add form fields to FormData
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
      });
      
      // Add files if present
      if (messageFile && data.messageInputType === 'file') {
        formData.append('messageFile', messageFile);
      }
      
      if (credsFile) {
        formData.append('credsFile', credsFile);
      }
      
      addLog('Starting WhatsApp messaging session...', 'info');
      setIsMessaging(true);
      
      const response = await axios.post('/api/start', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      addLog('WhatsApp messaging session started successfully', 'success');
    } catch (error) {
      addLog(`Error starting messaging: ${error.response?.data?.error || error.message}`, 'error');
      setIsMessaging(false);
      console.error('Error starting messaging:', error);
    }
  };

  const stopMessaging = async () => {
    try {
      addLog('Stopping WhatsApp messaging session...', 'info');
      await axios.post('/api/stop');
      setIsMessaging(false);
      addLog('WhatsApp messaging session stopped', 'success');
    } catch (error) {
      addLog(`Error stopping messaging: ${error.response?.data?.error || error.message}`, 'error');
      console.error('Error stopping messaging:', error);
    }
  };

  const handleMessageFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setMessageFile(e.target.files[0]);
      addLog(`Message file selected: ${e.target.files[0].name}`, 'info');
    }
  };

  const handleCredsFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setCredsFile(e.target.files[0]);
      addLog(`Credentials file selected: ${e.target.files[0].name}`, 'info');
    }
  };

  const addLog = (message, type = 'info') => {
    setLogs(prev => [...prev, { id: Date.now(), message, type, timestamp: new Date() }]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <Container>
      <Header>
        <h1>WhatsApp Messaging Server</h1>
      </Header>
      
      <StatusBar status={status}>
        <StatusDot status={status} />
        <span>
          Status: {status.charAt(0).toUpperCase() + status.slice(1)}
          {isMessaging && ' (Messaging in progress)'}
        </span>
      </StatusBar>
      
      <ButtonGroup>
        {!isMessaging ? (
          <Button
            className="primary"
            onClick={handleSubmit(onSubmit)}
            disabled={status !== 'open' && status !== 'connected'}
          >
            Start Messaging
          </Button>
        ) : (
          <Button className="danger" onClick={stopMessaging}>
            Stop Messaging
          </Button>
        )}
      </ButtonGroup>
      
      <Form onSubmit={handleSubmit(onSubmit)}>
        <FormSection>
          <SectionTitle>Authentication</SectionTitle>
          
          {pairingStep === 1 && (
            <>
              <FormGroup>
                <label htmlFor="userPhone">Your Phone Number with Country Code</label>
                <input
                  id="userPhone"
                  type="text"
                  placeholder="e.g. 4074589725"
                  {...register('userPhone', { required: 'Phone number is required' })}
                />
                {errors.userPhone && <ErrorMessage>{errors.userPhone.message}</ErrorMessage>}
              </FormGroup>
              
              <Button type="button" className="primary" onClick={generatePairingCode}>
                Generate Pairing Code
              </Button>
            </>
          )}
          
          {pairingStep === 2 && (
            <>
              <FormGroup>
                <label>Pairing Code</label>
                <PairingCodeContainer>{pairingCode}</PairingCodeContainer>
                <p>
                  Open WhatsApp on your phone &gt; Settings &gt; Linked Devices &gt; Link a Device &gt; 
                  Enter the above pairing code when prompted
                </p>
              </FormGroup>
              
              <ButtonGroup>
                <Button type="button" className="primary" onClick={() => setPairingStep(1)}>
                  Back
                </Button>
              </ButtonGroup>
            </>
          )}
          
          {pairingStep === 3 && (
            <div>
              <p style={{ color: '#7ee787' }}>✓ Connected to WhatsApp successfully</p>
              <FormGroup>
                <label htmlFor="credsFile">Upload Credentials File (Optional)</label>
                <input
                  id="credsFile"
                  type="file"
                  onChange={handleCredsFileChange}
                />
                <small>You can upload a previously saved credentials file to restore your session.</small>
              </FormGroup>
            </div>
          )}
        </FormSection>
        
        <FormSection>
          <SectionTitle>User Information</SectionTitle>
          
          <FormGroup>
            <label htmlFor="userPhone">Your Phone Number with Country Code</label>
            <input
              id="userPhone"
              type="text"
              placeholder="e.g. 4074589725"
              {...register('userPhone', { required: 'Phone number is required' })}
            />
            {errors.userPhone && <ErrorMessage>{errors.userPhone.message}</ErrorMessage>}
          </FormGroup>
          
          <FormGroup>
            <label htmlFor="targetType">Target Type</label>
            <select id="targetType" {...register('targetType')}>
              <option value="individual">Individual Contact</option>
              <option value="group">Group</option>
            </select>
          </FormGroup>
          
          <FormGroup>
            <label htmlFor="targetPhones">
              {targetType === 'group' ? 'Group IDs' : 'Target Phone Numbers'}
            </label>
            <textarea
              id="targetPhones"
              placeholder={targetType === 'group' 
                ? "Enter group IDs separated by commas"
                : "Enter phone numbers with country code separated by commas (e.g. 4074589725,4074589726)"}
              {...register('targetPhones', { required: 'Target numbers/groups are required' })}
            ></textarea>
            {errors.targetPhones && <ErrorMessage>{errors.targetPhones.message}</ErrorMessage>}
          </FormGroup>
        </FormSection>
        
        <FormSection>
          <SectionTitle>Message Details</SectionTitle>
          
          <FormGroup>
            <label>Message Input Method</label>
            <RadioGroup>
              <label>
                <input
                  type="radio"
                  value="direct"
                  {...register('messageInputType')}
                /> Direct Input
              </label>
              <label>
                <input
                  type="radio"
                  value="file"
                  {...register('messageInputType')}
                /> File Upload
              </label>
            </RadioGroup>
          </FormGroup>
          
          {messageInputType === 'direct' ? (
            <FormGroup>
              <label htmlFor="messageText">Message Text</label>
              <textarea
                id="messageText"
                placeholder="Enter your message here"
                {...register('messageText', { 
                  required: messageInputType === 'direct' ? 'Message text is required' : false 
                })}
              ></textarea>
              {errors.messageText && <ErrorMessage>{errors.messageText.message}</ErrorMessage>}
            </FormGroup>
          ) : (
            <FormGroup>
              <label htmlFor="messageFile">Message File</label>
              <input
                id="messageFile"
                type="file"
                onChange={handleMessageFileChange}
              />
              {messageFile && <p>Selected file: {messageFile.name}</p>}
            </FormGroup>
          )}
          
          <FormGroup>
            <label htmlFor="messageDelay">Delay Between Messages (seconds)</label>
            <input
              id="messageDelay"
              type="number"
              min="1"
              {...register('messageDelay', { 
                required: 'Delay is required',
                min: { value: 1, message: 'Minimum delay is 1 second' }
              })}
            />
            {errors.messageDelay && <ErrorMessage>{errors.messageDelay.message}</ErrorMessage>}
          </FormGroup>
          
          <FormGroup>
            <label>
              <input
                type="checkbox"
                {...register('enableRetry')}
              /> Enable message retry on failure
            </label>
          </FormGroup>
          
          {enableRetry && (
            <FormGroup>
              <label htmlFor="maxRetries">Maximum Retry Attempts</label>
              <input
                id="maxRetries"
                type="number"
                min="1"
                max="10"
                {...register('maxRetries', { 
                  required: enableRetry ? 'Max retries is required' : false,
                  min: { value: 1, message: 'Minimum retries is 1' },
                  max: { value: 10, message: 'Maximum retries is 10' }
                })}
              />
              {errors.maxRetries && <ErrorMessage>{errors.maxRetries.message}</ErrorMessage>}
            </FormGroup>
          )}
        </FormSection>
      </Form>
      
      <LogContainer>
        <SectionTitle>
          Messaging Log
          <Button 
            type="button" 
            style={{ float: 'right', padding: '3px 8px', fontSize: '12px' }}
            onClick={clearLogs}
          >
            Clear Log
          </Button>
        </SectionTitle>
        
        {logs.length === 0 ? (
          <p>No logs yet...</p>
        ) : (
          logs.map(log => (
            <LogEntry key={log.id} className={log.type}>
              [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
            </LogEntry>
          ))
        )}
      </LogContainer>
    </Container>
  );
};

export default WhatsAppMessageForm;