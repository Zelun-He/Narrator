'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';

interface TtsResponse {
  success: boolean;
  audioUrl?: string;
  error?: string;
  duration?: number;
  timestamp?: number;
}

export function TtsDemo() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [mode, setMode] = useState<'streaming' | 'persistent'>('streaming');
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter some text',
        variant: 'destructive',
      });
      return;
    }

    if (text.length > 5000) {
      toast({
        title: 'Error',
        description: 'Text exceeds maximum length of 5000 characters',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          persist: mode === 'persistent',
        }),
      });

      if (!response.ok) {
        const error: TtsResponse = await response.json();
        throw new Error(error.error || 'Failed to generate audio');
      }

      if (mode === 'persistent') {
        const data: TtsResponse = await response.json();
        if (data.success && data.audioUrl) {
          setAudioUrl(data.audioUrl);
          setDuration(data.duration || null);
          toast({
            title: 'Success',
            description: `Audio generated (${data.duration?.toFixed(2)}s)`,
          });
        }
      } else {
        // Streaming mode
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Try to get duration from audio element
        if (audioRef.current) {
          audioRef.current.onloadedmetadata = () => {
            setDuration(audioRef.current?.duration || null);
          };
        }

        toast({
          title: 'Success',
          description: 'Audio generated and ready to play',
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = () => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;

    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `audio-${Date.now()}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Text-to-Speech Generator</CardTitle>
        <CardDescription>
          Convert text to speech using Piper TTS
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Text Input */}
        <div className="space-y-2">
          <label htmlFor="text" className="text-sm font-medium">
            Text to Generate
          </label>
          <Textarea
            id="text"
            placeholder="Enter text to convert to speech..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading}
            className="min-h-[100px]"
          />
          <p className="text-xs text-muted-foreground">
            {text.length} / 5000 characters
          </p>
        </div>

        {/* Mode Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Output Mode</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="streaming"
                checked={mode === 'streaming'}
                onChange={(e) => setMode(e.target.value as 'streaming' | 'persistent')}
                disabled={loading}
              />
              <span className="text-sm">
                Streaming (Direct audio, no storage)
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="persistent"
                checked={mode === 'persistent'}
                onChange={(e) => setMode(e.target.value as 'streaming' | 'persistent')}
                disabled={loading}
              />
              <span className="text-sm">
                Persistent (Save to /public/audio)
              </span>
            </label>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={loading || !text.trim()}
          className="w-full"
        >
          {loading ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Generating...
            </>
          ) : (
            'Generate Audio'
          )}
        </Button>

        {/* Audio Player */}
        {audioUrl && (
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Generated Audio</label>
              <audio
                ref={audioRef}
                src={audioUrl}
                controls
                className="w-full"
              />
            </div>

            {duration !== null && (
              <p className="text-xs text-muted-foreground">
                Duration: {duration.toFixed(2)} seconds
              </p>
            )}

            {mode === 'streaming' && (
              <Button
                onClick={handleDownload}
                variant="outline"
                className="w-full"
              >
                Download Audio
              </Button>
            )}

            {mode === 'persistent' && audioUrl.startsWith('/audio/') && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  File saved to: <code className="bg-muted px-2 py-1 rounded">{audioUrl}</code>
                </p>
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="w-full"
                >
                  Download from Public Storage
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Info Section */}
        <div className="bg-muted p-3 rounded text-xs text-muted-foreground space-y-1">
          <p className="font-medium">How it works:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Streaming:</strong> Audio is generated and played directly without saving to disk</li>
            <li><strong>Persistent:</strong> Audio is saved to <code className="bg-background px-1">/public/audio/</code> for re-use</li>
            <li>Maximum text length: 5000 characters</li>
            <li>Audio format: WAV with 16-bit PCM encoding</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
