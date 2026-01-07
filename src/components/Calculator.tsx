import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calculator as CalcIcon, Delete, X } from 'lucide-react';

interface CalculatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (result: string) => void;
}

export function Calculator({ open, onOpenChange, onResult }: CalculatorProps) {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const deleteLast = () => {
    if (display.length === 1 || (display.length === 2 && display.startsWith('-'))) {
      setDisplay('0');
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(display);
    } else if (operation) {
      const prev = parseFloat(previousValue);
      let result: number;

      switch (operation) {
        case '+':
          result = prev + inputValue;
          break;
        case '-':
          result = prev - inputValue;
          break;
        case '×':
          result = prev * inputValue;
          break;
        case '÷':
          result = inputValue !== 0 ? prev / inputValue : 0;
          break;
        default:
          result = inputValue;
      }

      setDisplay(String(result));
      setPreviousValue(String(result));
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = () => {
    if (!operation || previousValue === null) return;

    const inputValue = parseFloat(display);
    const prev = parseFloat(previousValue);
    let result: number;

    switch (operation) {
      case '+':
        result = prev + inputValue;
        break;
      case '-':
        result = prev - inputValue;
        break;
      case '×':
        result = prev * inputValue;
        break;
      case '÷':
        result = inputValue !== 0 ? prev / inputValue : 0;
        break;
      default:
        result = inputValue;
    }

    setDisplay(String(result));
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(true);
  };

  const useResult = () => {
    const result = Math.round(parseFloat(display));
    if (!isNaN(result) && result > 0) {
      onResult(String(result));
      onOpenChange(false);
      clear();
    }
  };

  const buttonClass = "h-12 text-lg font-medium transition-all active:scale-95";
  const operatorClass = "bg-primary/10 hover:bg-primary/20 text-primary";
  const numberClass = "bg-muted hover:bg-muted/80";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalcIcon className="h-5 w-5" />
            Kalkulator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Display */}
          <div className="bg-muted/50 rounded-lg p-4 text-right">
            <div className="text-xs text-muted-foreground h-4">
              {previousValue && operation && `${previousValue} ${operation}`}
            </div>
            <div className="text-3xl font-mono font-bold truncate">
              {Number(display).toLocaleString('id-ID')}
            </div>
          </div>

          {/* Buttons Grid */}
          <div className="grid grid-cols-4 gap-2">
            <Button variant="outline" className={`${buttonClass} text-destructive`} onClick={clear}>
              C
            </Button>
            <Button variant="outline" className={buttonClass} onClick={deleteLast}>
              <Delete className="h-5 w-5" />
            </Button>
            <Button variant="outline" className={`${buttonClass} ${operatorClass}`} onClick={() => performOperation('÷')}>
              ÷
            </Button>
            <Button variant="outline" className={`${buttonClass} ${operatorClass}`} onClick={() => performOperation('×')}>
              ×
            </Button>

            <Button variant="outline" className={`${buttonClass} ${numberClass}`} onClick={() => inputDigit('7')}>7</Button>
            <Button variant="outline" className={`${buttonClass} ${numberClass}`} onClick={() => inputDigit('8')}>8</Button>
            <Button variant="outline" className={`${buttonClass} ${numberClass}`} onClick={() => inputDigit('9')}>9</Button>
            <Button variant="outline" className={`${buttonClass} ${operatorClass}`} onClick={() => performOperation('-')}>
              −
            </Button>

            <Button variant="outline" className={`${buttonClass} ${numberClass}`} onClick={() => inputDigit('4')}>4</Button>
            <Button variant="outline" className={`${buttonClass} ${numberClass}`} onClick={() => inputDigit('5')}>5</Button>
            <Button variant="outline" className={`${buttonClass} ${numberClass}`} onClick={() => inputDigit('6')}>6</Button>
            <Button variant="outline" className={`${buttonClass} ${operatorClass}`} onClick={() => performOperation('+')}>
              +
            </Button>

            <Button variant="outline" className={`${buttonClass} ${numberClass}`} onClick={() => inputDigit('1')}>1</Button>
            <Button variant="outline" className={`${buttonClass} ${numberClass}`} onClick={() => inputDigit('2')}>2</Button>
            <Button variant="outline" className={`${buttonClass} ${numberClass}`} onClick={() => inputDigit('3')}>3</Button>
            <Button className={`${buttonClass} row-span-2`} onClick={calculate}>
              =
            </Button>

            <Button variant="outline" className={`${buttonClass} ${numberClass} col-span-2`} onClick={() => inputDigit('0')}>
              0
            </Button>
            <Button variant="outline" className={`${buttonClass} ${numberClass}`} onClick={inputDecimal}>
              ,
            </Button>
          </div>

          {/* Use Result Button */}
          <Button className="w-full" variant="default" onClick={useResult}>
            Gunakan Hasil
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}