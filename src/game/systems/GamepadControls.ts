import Phaser from 'phaser';
import { AttackInput, MovementInput } from '../utils/types';

export interface GamepadInput {
  movement: MovementInput;
  aim: MovementInput;
  actions: AttackInput;
  run: boolean;
  shootHeld: boolean;
  pause: boolean;
  restart: boolean;
  confirm: boolean;
  alternate: boolean;
  cancel: boolean;
}

const STICK_DEADZONE = 0.18;
const RUN_STICK_THRESHOLD = 0.82;
const BUTTON_THRESHOLD = 0.35;

const PAD_BUTTON = {
  a: 0,
  b: 1,
  x: 2,
  y: 3,
  leftShoulder: 4,
  rightShoulder: 5,
  leftTrigger: 6,
  rightTrigger: 7,
  select: 8,
  start: 9,
  dpadUp: 12,
  dpadDown: 13,
  dpadLeft: 14,
  dpadRight: 15,
} as const;

export class GamepadControls {
  private previousButtons = new Map<number, boolean>();
  private suppressNextInput: boolean;

  constructor(private scene: Phaser.Scene, suppressInitialInput = false) {
    this.suppressNextInput = suppressInitialInput;
  }

  getInput(): GamepadInput {
    const pad = this.getActivePad();
    if (!pad) {
      this.previousButtons.clear();
      return this.createEmptyInput();
    }

    const currentButtons = this.readButtons(pad);
    const movement = this.getMovementVector(pad);
    const rightStickAim = this.getStickVector(pad.rightStick);
    const aim = this.hasDirection(rightStickAim) ? rightStickAim : movement;
    const run =
      movement.run ||
      movement.x * movement.x + movement.y * movement.y >= RUN_STICK_THRESHOLD * RUN_STICK_THRESHOLD;

    const input: GamepadInput = this.suppressNextInput ? this.createEmptyInput() : {
      movement: { x: movement.x, y: movement.y },
      aim: { x: aim.x, y: aim.y },
      actions: {
        punch: this.justPressed(currentButtons, PAD_BUTTON.x),
        kick: this.justPressed(currentButtons, PAD_BUTTON.b),
        jump: this.justPressed(currentButtons, PAD_BUTTON.a),
        special: this.justPressed(currentButtons, PAD_BUTTON.y),
        shoot:
          this.justPressed(currentButtons, PAD_BUTTON.rightShoulder) ||
          this.justPressed(currentButtons, PAD_BUTTON.rightTrigger),
        evade:
          this.justPressed(currentButtons, PAD_BUTTON.leftShoulder) ||
          this.justPressed(currentButtons, PAD_BUTTON.leftTrigger),
      },
      run,
      shootHeld:
        this.isPressed(currentButtons, PAD_BUTTON.x) ||
        this.isPressed(currentButtons, PAD_BUTTON.rightShoulder) ||
        this.isPressed(currentButtons, PAD_BUTTON.rightTrigger),
      pause: this.justPressed(currentButtons, PAD_BUTTON.start),
      restart: this.justPressed(currentButtons, PAD_BUTTON.select),
      confirm: this.justPressed(currentButtons, PAD_BUTTON.a) || this.justPressed(currentButtons, PAD_BUTTON.start),
      alternate: this.justPressed(currentButtons, PAD_BUTTON.y),
      cancel: this.justPressed(currentButtons, PAD_BUTTON.b),
    };

    this.suppressNextInput = false;
    this.previousButtons = currentButtons;
    return input;
  }

  private getActivePad(): Phaser.Input.Gamepad.Gamepad | undefined {
    const gamepad = this.scene.input.gamepad;
    if (!gamepad) {
      return undefined;
    }

    return gamepad.getAll().find((pad) => pad.connected) ?? gamepad.pad1;
  }

  private readButtons(pad: Phaser.Input.Gamepad.Gamepad): Map<number, boolean> {
    const buttons = new Map<number, boolean>();
    Object.values(PAD_BUTTON).forEach((buttonIndex) => {
      buttons.set(buttonIndex, this.isButtonActive(pad, buttonIndex));
    });
    return buttons;
  }

  private getMovementVector(pad: Phaser.Input.Gamepad.Gamepad): MovementInput {
    const analog = this.getStickVector(pad.leftStick);
    const digital = new Phaser.Math.Vector2(
      (this.isButtonActive(pad, PAD_BUTTON.dpadRight) || pad.right ? 1 : 0) -
        (this.isButtonActive(pad, PAD_BUTTON.dpadLeft) || pad.left ? 1 : 0),
      (this.isButtonActive(pad, PAD_BUTTON.dpadDown) || pad.down ? 1 : 0) -
        (this.isButtonActive(pad, PAD_BUTTON.dpadUp) || pad.up ? 1 : 0),
    );

    const combined = new Phaser.Math.Vector2(analog.x + digital.x, analog.y + digital.y);
    if (combined.lengthSq() > 1) {
      combined.normalize();
    }

    return {
      x: combined.x,
      y: combined.y,
      run: combined.lengthSq() >= RUN_STICK_THRESHOLD * RUN_STICK_THRESHOLD,
    };
  }

  private getStickVector(stick: Phaser.Math.Vector2): MovementInput {
    const vector = new Phaser.Math.Vector2(stick.x, stick.y);
    const magnitude = vector.length();
    if (magnitude <= STICK_DEADZONE) {
      return { x: 0, y: 0 };
    }

    const scaledMagnitude = Phaser.Math.Clamp((magnitude - STICK_DEADZONE) / (1 - STICK_DEADZONE), 0, 1);
    vector.normalize().scale(scaledMagnitude);
    return { x: vector.x, y: vector.y };
  }

  private isButtonActive(pad: Phaser.Input.Gamepad.Gamepad, buttonIndex: number): boolean {
    if (buttonIndex >= pad.getButtonTotal()) {
      return false;
    }

    return pad.getButtonValue(buttonIndex) > BUTTON_THRESHOLD || pad.isButtonDown(buttonIndex);
  }

  private justPressed(buttons: Map<number, boolean>, buttonIndex: number): boolean {
    return this.isPressed(buttons, buttonIndex) && !this.previousButtons.get(buttonIndex);
  }

  private isPressed(buttons: Map<number, boolean>, buttonIndex: number): boolean {
    return buttons.get(buttonIndex) ?? false;
  }

  private hasDirection(movement: MovementInput): boolean {
    return movement.x * movement.x + movement.y * movement.y > 0.01;
  }

  private createEmptyInput(): GamepadInput {
    return {
      movement: { x: 0, y: 0 },
      aim: { x: 0, y: 0 },
      actions: { punch: false, kick: false, jump: false, special: false, shoot: false, evade: false },
      run: false,
      shootHeld: false,
      pause: false,
      restart: false,
      confirm: false,
      alternate: false,
      cancel: false,
    };
  }
}
