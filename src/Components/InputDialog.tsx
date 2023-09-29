import { Dialog, DialogTitle, DialogContent, DialogContentText, TextField, DialogActions, Button } from "@mui/material";
import React from "react";



export type InputDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  // nothing or return error message
  defaultValue?: string;
  onConfirm: (answer: string) => string | null;
  title: string;
  description: string;
  readonly: boolean;
};

export function InputDialog({
  open,
  setOpen,
  onConfirm: answerHandler,
  defaultValue,
  title,
  description,
  readonly,
}: InputDialogProps) {
  const [answer, setAnswer] = React.useState(defaultValue ?? "");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    setAnswer(defaultValue ?? "");
    setError("");
  }, [open, defaultValue]);

  return (
    <Dialog open={open} onClose={() => setOpen(false)}
      maxWidth="lg"
      fullWidth={true}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          <div dangerouslySetInnerHTML={{ __html: description }} />
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          label="Text"
          type="text"
          fullWidth
          variant="standard"
          value={answer}
          onChange={(e) => {
            setAnswer(e.target.value);
          }}
          error={error !== ""}
          helperText={error}
          disabled={readonly}
          multiline
          rows={20}
        />
      </DialogContent>
      <DialogActions>
        {
          !readonly &&
          <Button
            onClick={() => {
              const error = answerHandler(answer);
              if (error === null) {
                setOpen(false);
              } else {
                setError(error);
              }
            }}
          >
            Submit
          </Button>
        }
        <Button onClick={() => setOpen(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}