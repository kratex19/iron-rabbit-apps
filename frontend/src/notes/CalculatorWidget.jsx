import React, { useState } from "react";
import { toast } from "sonner";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

/**
 * Small calculator dialog. Optionally inserts the current display
 * value back into the caller (used by NoteModal to inject a number
 * into the note body).
 */
export default function CalculatorWidget({ isOpen, onClose, onInsertResult, isDark }) {
  const [display, setDisplay] = useState("0");
  const [memory, setMemory] = useState(null);
  const [operator, setOperator] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = (digit) => {
    if (waitingForOperand) { setDisplay(digit); setWaitingForOperand(false); }
    else { setDisplay(display === "0" ? digit : display + digit); }
  };
  const inputDecimal = () => {
    if (waitingForOperand) { setDisplay("0."); setWaitingForOperand(false); }
    else if (!display.includes(".")) { setDisplay(display + "."); }
  };
  const clear = () => { setDisplay("0"); setMemory(null); setOperator(null); setWaitingForOperand(false); };

  const compute = (op, a, b) => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b !== 0 ? a / b : "Error";
      default:  return b;
    }
  };

  const performOperation = (nextOperator) => {
    const inputValue = parseFloat(display);
    if (memory === null) {
      setMemory(inputValue);
    } else if (operator) {
      const result = compute(operator, memory, inputValue);
      setDisplay(String(result));
      setMemory(result);
    }
    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  const calculate = () => {
    if (!operator || memory === null) return;
    const inputValue = parseFloat(display);
    const result = compute(operator, memory, inputValue);
    setDisplay(String(result));
    setMemory(null);
    setOperator(null);
    setWaitingForOperand(true);
  };

  const insertToNote = () => {
    if (onInsertResult) {
      onInsertResult(display);
      toast.success("Result inserted");
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-xs ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`}>
        <DialogHeader>
          <DialogTitle className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Calculator className="w-5 h-5 text-indigo-500" /> Calculator
          </DialogTitle>
          <DialogDescription className="sr-only">Perform quick calculations and optionally insert the result into your current note.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className={`rounded-xl p-3 text-right ${isDark ? 'bg-black/30' : 'bg-gray-100'}`}>
            <div className={`font-mono text-2xl truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{display}</div>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <button onClick={clear} className={`calc-btn col-span-2 ${isDark ? '' : 'light'} text-red-500`}>C</button>
            <button onClick={() => performOperation("/")} className={`calc-btn calc-btn-operator ${isDark ? '' : 'light'}`}>/</button>
            <button onClick={() => performOperation("*")} className={`calc-btn calc-btn-operator ${isDark ? '' : 'light'}`}>×</button>
            {[7,8,9].map(n => <button key={n} onClick={() => inputDigit(String(n))} className={`calc-btn ${isDark ? '' : 'light'}`}>{n}</button>)}
            <button onClick={() => performOperation("-")} className={`calc-btn calc-btn-operator ${isDark ? '' : 'light'}`}>-</button>
            {[4,5,6].map(n => <button key={n} onClick={() => inputDigit(String(n))} className={`calc-btn ${isDark ? '' : 'light'}`}>{n}</button>)}
            <button onClick={() => performOperation("+")} className={`calc-btn calc-btn-operator ${isDark ? '' : 'light'}`}>+</button>
            {[1,2,3].map(n => <button key={n} onClick={() => inputDigit(String(n))} className={`calc-btn ${isDark ? '' : 'light'}`}>{n}</button>)}
            <button onClick={calculate} className="calc-btn calc-btn-equals row-span-2">=</button>
            <button onClick={() => inputDigit("0")} className={`calc-btn col-span-2 ${isDark ? '' : 'light'}`}>0</button>
            <button onClick={inputDecimal} className={`calc-btn ${isDark ? '' : 'light'}`}>.</button>
          </div>
          {onInsertResult && (
            <Button onClick={insertToNote} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white" size="sm">Insert Result</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
